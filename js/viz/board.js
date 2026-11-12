// Řešení na tabuli: řádky postupu psané „křídou“ na tmavou tabuli + oranžové poznámky
// (složená závorka s popiskem, přeškrtnutí při krácení, podtržení, dvojité podtržení výsledku).
//
// Datový tvar (pole kroku krokovače):
//   step.board = BoardLine[]            – řádky, které tento krok na tabuli dopíše
//   BoardLine  = { tex: string, notes?: Note[] }
//   Note       = { kind: 'brace'|'strike'|'underline'|'doubleUnderline'|'color',
//                  target: string, label?: string, color?: 'accent'|'warn',
//                  position?: 'above'|'below' }   // position jen u 'brace', výchozí 'above'
//
// Konvence pro cíle poznámek: část vzorce se označí v TeXu příkazem
//   \htmlClass{bt-jmeno}{…}
// a Note.target je to jméno třídy ('bt-jmeno'). Jméno musí odpovídat /^bt-[a-z0-9-]+$/.
// KaTeX má jinak trust vypnutý; tabule mu předá funkci boardTrust, která povolí VÝHRADNĚ
// \htmlClass s takovou třídou (žádné \href, \htmlId, \includegraphics, styly ani data).
// Tutéž třídu lze použít víckrát (např. x+1 v čitateli i ve jmenovateli) – poznámka se
// pak nakreslí u každého výskytu. Příklad: js/topics/limita.js (krácení \htmlClass{bt-krat}{…}).
//
// Úklid: tabule se registruje do modulového seznamu živých tabulí (jeden posluchač načtení
// písem na dokument). Odpojené tabule se uvolní samy (ResizeObserver, další drawBoard),
// výslovně je uvolní disposeBoard(el) – krokovač ho volá v destroy() přes disposeStepVisual.
//
// Geometrie poznámek je v čistých funkcích (relRect, noteShapes), které dostávají naměřené
// obdélníky; měření přes getBoundingClientRect probíhá jen v layoutNotes. Vrstva SVG leží
// nad řádky ve stejném posuvném kontejneru, takže při vodorovném posunu sedí na vzorcích.
import { renderTex, h } from '../render.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const BOARD_CLASS_RE = /^bt-[a-z0-9-]+$/;
const KINDS = new Set(['brace', 'strike', 'underline', 'doubleUnderline', 'color']);
const WRITE_MS = 900;   // jak dlouho se „píše“ jeden řádek
const NOTE_MS = 500;    // jak dlouho se kreslí poznámka (po dopsání řádku)

// Funkce trust pro KaTeX: jen \htmlClass{bt-…}.
export function boardTrust(ctx) {
  return !!ctx && ctx.command === '\\htmlClass' && typeof ctx.class === 'string' && BOARD_CLASS_RE.test(ctx.class);
}

export function relRect(r, origin) {
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

// Sjednocení obdélníků {left, top, right, bottom}; prázdné (nulové) se vynechají.
export function unionRects(rects) {
  let u = null;
  for (const r of rects) {
    if (!r || !(r.width > 0 || r.height > 0)) continue;
    const right = r.left + r.width;
    const bottom = r.top + r.height;
    if (!u) u = { left: r.left, top: r.top, right, bottom };
    else {
      u.left = Math.min(u.left, r.left); u.top = Math.min(u.top, r.top);
      u.right = Math.max(u.right, right); u.bottom = Math.max(u.bottom, bottom);
    }
  }
  return u && { left: u.left, top: u.top, width: u.right - u.left, height: u.bottom - u.top };
}

const n = (v) => Math.round(v * 10) / 10;

function bracePath(x, w, base, dir) {
  // dir = -1 nad cílem (hroty dolů k cíli), +1 pod cílem
  const c = x + w / 2;
  const rr = Math.max(1, Math.min(6, w / 4));
  const yl = base + dir * 6;
  const peak = yl + dir * 5;
  return `M ${n(x)} ${n(base)} Q ${n(x)} ${n(yl)} ${n(x + rr)} ${n(yl)} L ${n(c - rr)} ${n(yl)} `
    + `Q ${n(c)} ${n(yl)} ${n(c)} ${n(peak)} Q ${n(c)} ${n(yl)} ${n(c + rr)} ${n(yl)} `
    + `L ${n(x + w - rr)} ${n(yl)} Q ${n(x + w)} ${n(yl)} ${n(x + w)} ${n(base)}`;
}

// Tvary jedné poznámky pro obdélník cíle r = {x, y, w, h} (souřadnice tabule).
// Vrací [{type:'path', d}, {type:'text', x, y, text}], u 'color' a neznámých druhů [].
export function noteShapes(note, r) {
  if (!note || !r) return [];
  const { x, y, w } = r;
  const hgt = r.h;
  switch (note.kind) {
    case 'brace': {
      const below = note.position === 'below';
      const base = below ? y + hgt + 3 : y - 3;
      const dir = below ? 1 : -1;
      const out = [{ type: 'path', d: bracePath(x, w, base, dir) }];
      if (note.label != null && note.label !== '') {
        const peak = base + dir * 11;
        out.push({ type: 'text', x: n(x + w / 2), y: n(below ? peak + 19 : peak - 6), text: String(note.label) });
      }
      return out;
    }
    case 'strike':
      return [{ type: 'path', d: `M ${n(x - 2)} ${n(y + hgt * 0.64)} L ${n(x + w + 2)} ${n(y + hgt * 0.36)}` }];
    case 'underline':
      return [{ type: 'path', d: `M ${n(x - 2)} ${n(y + hgt + 4)} L ${n(x + w + 2)} ${n(y + hgt + 4)}` }];
    case 'doubleUnderline':
      return [
        { type: 'path', d: `M ${n(x - 6)} ${n(y + hgt + 5)} L ${n(x + w + 6)} ${n(y + hgt + 5)}` },
        { type: 'path', d: `M ${n(x - 6)} ${n(y + hgt + 10)} L ${n(x + w + 6)} ${n(y + hgt + 10)}` },
      ];
    default:
      return [];
  }
}

// Platný řádek tabule (stejné filtrování v boardForStep i drawBoard).
const isLine = (l) => !!l && typeof l === 'object';

// Z kroků krokovače složí tabuli: všechny řádky všech kroků a kolik jich patří až po krok index.
// Krok bez platného řádku v poli board → null (krokovač pak použije jinou grafiku).
export function boardForStep(steps, index) {
  const list = Array.isArray(steps) ? steps : [];
  const own = (s) => (Array.isArray(s?.board) ? s.board.filter(isLine) : []);
  if (own(list[index]).length === 0) return null;
  const lines = [];
  let upTo = 0;
  list.forEach((s, i) => {
    const b = own(s);
    lines.push(...b);
    if (i <= index) upTo += b.length;
  });
  return { lines, upTo };
}

// Popis poznámky pro čtečky obrazovky (vrstva SVG je aria-hidden).
export function noteDescription(note) {
  const label = note.label != null && note.label !== '' ? String(note.label) : '';
  switch (note.kind) {
    case 'brace': return `Závorka ${note.position === 'below' ? 'pod' : 'nad'} částí výrazu${label ? `, hodnota ${label}` : ''}.`;
    case 'strike': return `Přeškrtnuto, krátí se${label ? `: ${label}` : ''}.`;
    case 'underline': return `Podtrženo${label ? `: ${label}` : ''}.`;
    case 'doubleUnderline': return `Dvojitě podtržený výsledek${label ? `: ${label}` : ''}.`;
    case 'color': return `Zvýrazněno${label ? `: ${label}` : ''}.`;
    default: return '';
  }
}

const state = new WeakMap(); // el -> { sig, count, scrollLeft, entry }
// Živé tabule: jeden posluchač načtení písem na dokument přepočítá jen připojené tabule;
// odpojené se při první příležitosti uvolní (žádné uzávěry nad starým DOM).
const live = new Set(); // entry = { doc, inner, layout, ro }
const hookedDocs = new WeakSet();

function disposeEntry(entry) {
  if (!entry) return;
  entry.ro?.disconnect();
  live.delete(entry);
}

function pruneLive() {
  for (const e of live) if (!e.inner.isConnected) disposeEntry(e);
}

function relayoutDoc(doc) {
  for (const e of [...live]) {
    if (e.doc !== doc) continue;
    if (e.inner.isConnected) e.layout(); else disposeEntry(e);
  }
}

function hookFonts(doc) {
  const fonts = doc.fonts;
  if (!fonts || hookedDocs.has(doc)) return;
  hookedDocs.add(doc);
  if (typeof fonts.addEventListener === 'function') fonts.addEventListener('loadingdone', () => relayoutDoc(doc));
}

// Přepočítá poznámky všech připojených tabulí v dokumentu (odpojené uvolní).
export function relayoutBoards(doc) { relayoutDoc(doc); }

// Pro testy a ladění: kolik tabulí je právě sledováno.
export function liveBoardCount() { return live.size; }

// Uvolní tabuli v el (pozorovatele velikosti, registraci) a smaže její obsah i stav.
export function disposeBoard(el) {
  if (!el) return;
  disposeEntry(state.get(el)?.entry);
  state.delete(el);
  el.querySelector?.('.board')?.remove();
}

function validNotes(line) {
  return (Array.isArray(line?.notes) ? line.notes : [])
    .filter((nt) => nt && KINDS.has(nt.kind) && typeof nt.target === 'string' && BOARD_CLASS_RE.test(nt.target));
}

function reducedMotion(win) {
  try { return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// Rozměr cíle: sjednocení listových prvků se sazbou (glyfy, zlomkové čáry); neviditelné
// vzpěry KaTeXu (.pstrut, .strut, .vlist-s) se vynechají, jinak by byl obdélník moc vysoký.
function measureTarget(t) {
  const leaves = [...t.querySelectorAll('*')].filter((e) =>
    !e.closest('.pstrut, .strut, .vlist-s, .katex-mathml')
    && (e.classList.contains('frac-line') || e.tagName.toLowerCase() === 'svg'
      || (e.childElementCount === 0 && e.textContent.trim() !== '')));
  return unionRects(leaves.map((e) => e.getBoundingClientRect())) || t.getBoundingClientRect();
}

// Vykreslí řádky 1..upTo. Vrací počet vykreslených řádků.
export function drawBoard(el, lines, upTo) {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  const all = Array.isArray(lines) ? lines.filter(isLine) : [];
  const count = Math.max(0, Math.min(Math.trunc(Number(upTo) || 0), all.length));

  const prev = state.get(el);
  disposeEntry(prev?.entry);
  pruneLive();
  const sig = all.map((l) => String(l.tex ?? '')).join('\n');
  const same = !!prev && prev.sig === sig;
  const before = same ? prev.count : 0; // jinak se píše od začátku
  const animate = !reducedMotion(win);

  el.textContent = '';
  if (count === 0) { state.set(el, { sig, count, scrollLeft: 0 }); return 0; }

  const inner = h(doc, 'div', { class: 'board-inner' });
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'board-notes');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const scroller = h(doc, 'div', { class: 'board-scroll', role: 'region', tabindex: '0', 'aria-label': 'Řádky postupu na tabuli' }, inner);
  const board = h(doc, 'div', { class: 'board', role: 'group', 'aria-label': 'Tabule s postupem' }, scroller);

  const t0 = win?.performance?.now?.() ?? Date.now();
  const rows = [];
  for (let i = 0; i < count; i++) {
    const line = all[i];
    const notes = validNotes(line);
    const isNew = animate && i >= before;
    const row = h(doc, 'div', { class: 'board-line' });
    if (notes.some((nt) => nt.kind === 'brace' && nt.position !== 'below')) row.classList.add('has-over');
    if (notes.some((nt) => (nt.kind === 'brace' && nt.position === 'below') || nt.kind === 'doubleUnderline')) row.classList.add('has-under');
    const delay = isNew ? (i - before) * (WRITE_MS + 250) : 0;
    if (isNew) { row.classList.add('is-new'); row.style.setProperty('--d', `${delay}ms`); }
    const tex = h(doc, 'div', { class: 'board-tex' });
    renderTex(tex, line.tex, { display: true, trust: boardTrust });
    row.appendChild(tex);
    const present = notes.filter((nt) => row.getElementsByClassName(nt.target).length > 0);
    if (present.length) {
      row.appendChild(h(doc, 'ul', { class: 'board-sr' },
        present.map((nt) => h(doc, 'li', { text: noteDescription(nt) }))));
    }
    inner.appendChild(row);
    rows.push({ row, notes: present, noteAt: isNew ? t0 + delay + WRITE_MS * 0.8 : null });
    for (const nt of present) {
      if (nt.kind !== 'color') continue;
      for (const t of row.getElementsByClassName(nt.target)) t.classList.add(nt.color === 'warn' ? 'bc-warn' : 'bc-accent');
    }
  }
  inner.appendChild(svg);
  el.appendChild(board);

  const st = { sig, count, scrollLeft: same ? prev.scrollLeft || 0 : 0, entry: null };
  if (st.scrollLeft) scroller.scrollLeft = st.scrollLeft;
  scroller.addEventListener('scroll', () => { st.scrollLeft = scroller.scrollLeft; }, { passive: true });

  // Prvky poznámek se vytvoří jednou (jen tehdy se případně animují) a při dalších
  // přepočtech se jim mění jen souřadnice, takže se animace kreslení nerestartuje.
  const drawn = new Map(); // klíč -> { g, kids: [{type, node}] }
  let firstLayout = true;
  function layout() {
    const origin = inner.getBoundingClientRect();
    // Vrstva SVG je uvnitř inner a sama by zvětšovala jeho scrollWidth (výchozí šířka SVG je 300 px),
    // takže se nejdřív vynuluje a teprve pak se změří obsah – jinak tabule na úzkém displeji vždy přetéká.
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('width', String(Math.max(0, inner.scrollWidth || origin.width)));
    svg.setAttribute('height', String(Math.max(0, inner.scrollHeight || origin.height)));
    const now = win?.performance?.now?.() ?? Date.now();
    const seen = new Set();
    rows.forEach(({ row, notes, noteAt }, ri) => {
      notes.forEach((nt, ni) => {
        const targets = [...row.getElementsByClassName(nt.target)];
        targets.forEach((t, ti) => {
          const shapes = noteShapes(nt, relRect(measureTarget(t), origin));
          if (!shapes.length) return;
          const key = `${ri}:${ni}:${ti}`;
          seen.add(key);
          let rec = drawn.get(key);
          if (!rec || rec.kids.length !== shapes.length || rec.kids.some((k, i) => k.type !== shapes[i].type)) {
            rec?.g.remove();
            const g = doc.createElementNS(SVG_NS, 'g');
            g.setAttribute('class', `bn bn-${nt.kind} ${nt.color === 'warn' ? 'bn-warn' : 'bn-accent'}`);
            if (firstLayout && noteAt != null && now < noteAt + NOTE_MS) {
              g.classList.add('is-new');
              g.style.setProperty('--nd', `${Math.round(noteAt - now)}ms`);
            }
            const kids = shapes.map((s) => {
              const node = doc.createElementNS(SVG_NS, s.type === 'path' ? 'path' : 'text');
              if (s.type === 'path') node.setAttribute('pathLength', '1');
              else node.setAttribute('text-anchor', 'middle');
              g.appendChild(node);
              return { type: s.type, node };
            });
            svg.appendChild(g);
            rec = { g, kids };
            drawn.set(key, rec);
          }
          shapes.forEach((s, i) => {
            const node = rec.kids[i].node;
            if (s.type === 'path') node.setAttribute('d', s.d);
            else {
              node.setAttribute('x', String(s.x));
              node.setAttribute('y', String(s.y));
              node.textContent = s.text; // vždy jako text, nikdy HTML
            }
          });
        });
      });
    });
    for (const [key, rec] of drawn) if (!seen.has(key)) { rec.g.remove(); drawn.delete(key); }
    firstLayout = false;
  }

  layout();
  const entry = { doc, inner, layout, ro: null };
  if (typeof win?.ResizeObserver === 'function') {
    // Při odpojení z DOM hlásí pozorovatel nulovou velikost – tabule se tím sama uvolní.
    entry.ro = new win.ResizeObserver(() => { if (inner.isConnected) layout(); else disposeEntry(entry); });
    entry.ro.observe(inner);
  }
  live.add(entry);
  st.entry = entry;
  hookFonts(doc);
  doc.fonts?.ready?.then?.(() => { if (live.has(entry) && inner.isConnected) layout(); });
  win?.requestAnimationFrame?.(() => { if (live.has(entry) && inner.isConnected) layout(); });
  state.set(el, st);
  return count;
}
