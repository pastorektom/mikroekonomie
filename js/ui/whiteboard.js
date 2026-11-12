// Kreslicí tabule: čistý zásobník tahů (bez DOM, testovatelný) + tenká vrstva nad <canvas>.
// Kresba žije jen v paměti stránky, nikam se neposílá.
import { h } from '../render.js';

// Zásobník tahů. Historie akcí: přidání tahu nebo „smazat vše“; undo vrací akce zpět.
export function createStrokeStore() {
  const actions = []; // { type:'stroke', stroke } | { type:'clear', strokes }
  let strokes = [];
  return {
    get strokes() { return strokes; },
    get canUndo() { return actions.length > 0; },
    addStroke(s) { strokes = [...strokes, s]; actions.push({ type: 'stroke', stroke: s }); },
    clear() {
      if (strokes.length === 0) return;
      actions.push({ type: 'clear', strokes });
      strokes = [];
    },
    undo() {
      const a = actions.pop();
      if (!a) return false;
      strokes = a.type === 'stroke' ? strokes.slice(0, -1) : a.strokes;
      return true;
    },
  };
}

// Rozhodne, zda nový stisk smí začít tah. Zbylý „aktivní“ tah (zmeškané pointerup/cancel)
// se zahodí: myš bez stisknutého tlačítka, nebo týž ukazatel, který stiskl znovu.
export function canStartStroke(active, e) {
  if (!active) return { start: true, stale: false };
  const stale = e.pointerId === active.id || (e.pointerType === 'mouse' && e.buttons === 0);
  return { start: stale, stale };
}

// Kreslicí plocha je vždy světlý papír, pera jsou černé, modré (poptávka) a červené (nabídka).
export const INKS = [
  { id: 'ink', label: 'Černá', css: '#10131a' },
  { id: 'red', label: 'Červená', css: '#e8452f' },
  { id: 'blue', label: 'Modrá', css: '#2740f0' },
];
const PEN_W = 2.6;
const ERASER_W = 22;

export function mountWhiteboard(el, { onChange } = {}) {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  const store = createStrokeStore();
  let tool = 'pen';
  let color = 'ink';
  let grid = false;
  let active = null; // { id, stroke }
  let ctx = null;
  let cssW = 0;
  let cssH = 0;
  let rect = null; // ohraničení plátna uložené při pointerdown

  const canvas = h(doc, 'canvas', { class: 'wb-canvas', role: 'img', 'aria-label': 'Kreslicí plocha. Piš prstem, myší nebo perem.' });
  canvas.style.touchAction = 'none';
  try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
  const stage = h(doc, 'div', { class: 'wb-stage' }, canvas);

  const mk = (role, text, label, onclick) =>
    h(doc, 'button', { type: 'button', class: 'wb-btn', 'data-role': role, 'aria-label': label, text, onclick });
  const penBtn = mk('wb-pen', 'Pero', 'Pero', () => setTool('pen'));
  const eraserBtn = mk('wb-eraser', 'Guma', 'Guma', () => setTool('eraser'));
  const colorBtns = INKS.map((c) => {
    const b = mk(`wb-color-${c.id}`, '', `Barva: ${c.label}`, () => { color = c.id; setTool('pen'); });
    b.classList.add('wb-color');
    b.style.setProperty('--ink-dot', c.css);
    return b;
  });
  const undoBtn = mk('wb-undo', 'Zpět', 'Krok zpět', () => api.undo());
  const clearBtn = mk('wb-clear', 'Smazat vše', 'Smazat vše', () => api.clear());
  const gridBtn = mk('wb-grid', 'Mřížka', 'Zobrazit nebo skrýt mřížku', () => { grid = !grid; sync(); });
  const bar = h(doc, 'div', { class: 'wb-bar', role: 'toolbar', 'aria-label': 'Nástroje tabule' },
    [penBtn, eraserBtn, ...colorBtns, undoBtn, clearBtn, gridBtn]);
  const root = h(doc, 'div', { class: 'wb' }, [bar, stage]);
  el.appendChild(root);

  function setTool(t) { tool = t; sync(); }

  function sync() {
    penBtn.setAttribute('aria-pressed', String(tool === 'pen'));
    eraserBtn.setAttribute('aria-pressed', String(tool === 'eraser'));
    colorBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(tool === 'pen' && INKS[i].id === color)));
    gridBtn.setAttribute('aria-pressed', String(grid));
    stage.classList.toggle('wb-grid', grid);
    undoBtn.disabled = !store.canUndo;
    clearBtn.disabled = store.strokes.length === 0;
  }

  function changed() {
    sync();
    redraw();
    if (typeof onChange === 'function') onChange({ strokes: store.strokes.length, canUndo: store.canUndo });
  }

  const inkCss = (id) => (INKS.find((c) => c.id === id) || INKS[0]).css;
  const widthOf = (s, p) => (s.tool === 'eraser' ? ERASER_W : PEN_W * (s.pressure && p > 0 ? 0.5 + p : 1.2));

  // Vykreslí body tahu od indexu from (při pohybu jen nový úsek, jinak celý tah).
  function drawStroke(c, s, from = 0) {
    c.save();
    c.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = c.fillStyle = s.tool === 'eraser' ? '#000' : inkCss(s.color);
    c.lineCap = c.lineJoin = 'round';
    const pts = s.points;
    if (pts.length === 1) {
      c.beginPath();
      c.arc(pts[0][0], pts[0][1], widthOf(s, pts[0][2]) / 2, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = Math.max(1, from); i < pts.length; i++) {
      c.lineWidth = widthOf(s, pts[i][2]);
      c.beginPath();
      c.moveTo(pts[i - 1][0], pts[i - 1][1]);
      c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }
    c.restore();
  }

  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, cssW, cssH);
    for (const s of store.strokes) drawStroke(ctx, s);
    if (active) drawStroke(ctx, active.stroke);
  }

  // Po změně velikosti se plátno přepočítá (devicePixelRatio) a tahy se překreslí ze zásobníku.
  function resize() {
    rect = null; // rozpracovaný tah si při dalším pohybu změří plátno znovu
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = win.devicePixelRatio || 1;
    cssW = r.width; cssH = r.height;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function pt(e) {
    const r = rect || (rect = canvas.getBoundingClientRect());
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5];
  }

  const end = (e) => {
    if (!active || (e.pointerId != null && e.pointerId !== active.id)) return;
    const st = active.stroke;
    active = null;
    rect = null;
    store.addStroke(st);
    changed();
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button > 0) return;
    const { start, stale } = canStartStroke(active, e);
    if (!start) return; // dlaň nebo druhý prst se ignoruje
    if (stale) end({ pointerId: active.id });
    e.preventDefault?.();
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* ignorováno */ }
    rect = canvas.getBoundingClientRect();
    active = { id: e.pointerId, stroke: { tool, color, pressure: e.pointerType === 'pen', points: [pt(e)] } };
    if (ctx) drawStroke(ctx, active.stroke);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault?.();
    const from = active.stroke.points.length;
    const evs = e.getCoalescedEvents?.();
    for (const ev of (evs && evs.length ? evs : [e])) active.stroke.points.push(pt(ev));
    if (ctx) drawStroke(ctx, active.stroke, from);
  });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);

  let ro = null;
  if (typeof win.ResizeObserver === 'function') { ro = new win.ResizeObserver(resize); ro.observe(canvas); }
  win.addEventListener?.('resize', resize);
  sync();
  resize();

  const api = {
    get strokeCount() { return store.strokes.length; },
    exportPng() {
      try {
        const out = doc.createElement('canvas');
        out.width = canvas.width; out.height = canvas.height;
        const c = out.getContext('2d');
        if (!c) return '';
        c.fillStyle = win.getComputedStyle(root).getPropertyValue('--board').trim() || '#ffffff';
        c.fillRect(0, 0, out.width, out.height);
        c.drawImage(canvas, 0, 0);
        return out.toDataURL('image/png');
      } catch { return ''; }
    },
    clear() { store.clear(); changed(); },
    undo() { if (store.undo()) changed(); },
    destroy() {
      ro?.disconnect();
      win.removeEventListener?.('resize', resize);
      root.remove();
    },
  };
  return api;
}
