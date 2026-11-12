import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { setTexEngine, renderTex } from '../js/render.js';
import {
  drawBoard, boardTrust, noteShapes, relRect, boardForStep,
  disposeBoard, liveBoardCount, relayoutBoards, noteDescription,
} from '../js/viz/board.js';
import { mountStepper } from '../js/ui/stepper.js';

function dom() {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  return window.document.getElementById('r');
}

// Náhradní „KaTeX“: \htmlClass{bt-x}{obsah} převede na <span class="bt-x">obsah</span>
// jen tehdy, když to dovolí funkce trust (stejně jako skutečný KaTeX).
function fakeKatex() {
  return {
    render(tex, target, opts) {
      const doc = target.ownerDocument;
      const re = /\\htmlClass\{([^}]*)\}\{([^}]*)\}/g;
      let last = 0; let m;
      while ((m = re.exec(tex))) {
        target.appendChild(doc.createTextNode(tex.slice(last, m.index)));
        const ok = typeof opts.trust === 'function' && opts.trust({ command: '\\htmlClass', class: m[1] });
        const span = doc.createElement('span');
        if (ok) span.className = m[1];
        span.textContent = m[2];
        target.appendChild(span);
        last = re.lastIndex;
      }
      target.appendChild(doc.createTextNode(tex.slice(last)));
    },
  };
}

const LINES = [
  { tex: 'a' },
  { tex: 'b = \\htmlClass{bt-x}{x+1}', notes: [{ kind: 'brace', target: 'bt-x', label: '3' }] },
  { tex: 'c' },
];

test('drawBoard: upTo=2 vykreslí přesně 2 řádky', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  drawBoard(el, LINES, 2);
  assert.equal(el.querySelectorAll('.board-line').length, 2);
  setTexEngine(null);
});

test('drawBoard: upTo mimo rozsah se ořízne', () => {
  const el = dom();
  drawBoard(el, LINES, 99);
  assert.equal(el.querySelectorAll('.board-line').length, 3);
  drawBoard(el, LINES, -1);
  assert.equal(el.querySelectorAll('.board-line').length, 0);
});

test('drawBoard: Note s neexistujícím target se přeskočí bez výjimky', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  const lines = [{ tex: 'x', notes: [{ kind: 'strike', target: 'bt-nic' }, { kind: 'underline', target: 'Neplatné jméno!' }] }];
  assert.doesNotThrow(() => drawBoard(el, lines, 1));
  assert.equal(el.querySelectorAll('.board-line').length, 1);
  assert.equal(el.querySelectorAll('svg .bn').length, 0);
  setTexEngine(null);
});

test('drawBoard: prázdné lines nic nevykreslí a nehodí chybu', () => {
  const el = dom();
  assert.doesNotThrow(() => drawBoard(el, [], 3));
  assert.equal(el.querySelectorAll('.board-line').length, 0);
  assert.doesNotThrow(() => drawBoard(el, undefined, 1));
  assert.doesNotThrow(() => drawBoard(el, null, 1));
});

test('drawBoard: popisek poznámky je text, ne HTML', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  const evil = '<img src=x onerror=alert(1)>';
  drawBoard(el, [{ tex: '\\htmlClass{bt-a}{x}', notes: [{ kind: 'brace', target: 'bt-a', label: evil }] }], 1);
  assert.equal(el.querySelectorAll('img').length, 0);
  const label = el.querySelector('svg text');
  assert.ok(label, 'popisek se vykreslí');
  assert.equal(label.textContent, evil);
  setTexEngine(null);
});

test('drawBoard: poznámka u existujícího cíle vytvoří tvar ve vrstvě SVG', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  drawBoard(el, LINES, 2);
  assert.ok(el.querySelectorAll('svg .bn').length >= 1);
  setTexEngine(null);
});

test('drawBoard: nové řádky se při krokování vpřed „píšou“, zpět ne', () => {
  const el = dom();
  drawBoard(el, LINES, 1);
  drawBoard(el, LINES, 3);
  const lines = el.querySelectorAll('.board-line');
  assert.equal(lines[0].classList.contains('is-new'), false);
  assert.equal(lines[1].classList.contains('is-new'), true);
  assert.equal(lines[2].classList.contains('is-new'), true);
  drawBoard(el, LINES, 2);
  assert.equal(el.querySelectorAll('.board-line.is-new').length, 0);
});

test('boardTrust: povolí jen \\htmlClass s třídou bt-…', () => {
  assert.equal(boardTrust({ command: '\\htmlClass', class: 'bt-a' }), true);
  assert.equal(boardTrust({ command: '\\htmlClass', class: 'bt-num-2' }), true);
  assert.equal(boardTrust({ command: '\\htmlClass', class: 'evil' }), false);
  assert.equal(boardTrust({ command: '\\htmlClass', class: 'bt-a x' }), false);
  assert.equal(boardTrust({ command: '\\htmlId', id: 'bt-a' }), false);
  assert.equal(boardTrust({ command: '\\href', url: 'javascript:alert(1)' }), false);
  assert.equal(boardTrust({ command: '\\includegraphics', url: 'x' }), false);
});

test('renderTex: trust je výchozí false, funkci předá jen na vyžádání', () => {
  const calls = [];
  setTexEngine({ render: (t, el, o) => calls.push(o.trust) });
  const el = dom();
  renderTex(el, 'x');
  renderTex(el, 'x', { trust: boardTrust });
  renderTex(el, 'x', { trust: true }); // jiné než funkce se nepovolí
  assert.deepEqual(calls, [false, boardTrust, false]);
  setTexEngine(null);
});

test('relRect: souřadnice vůči tabuli', () => {
  assert.deepEqual(relRect({ left: 110, top: 220, width: 30, height: 20 }, { left: 100, top: 200 }), { x: 10, y: 20, w: 30, h: 20 });
});

test('noteShapes: složená závorka nad cílem, popisek nad ní, uprostřed', () => {
  const r = { x: 100, y: 50, w: 80, h: 20 };
  const s = noteShapes({ kind: 'brace', target: 'bt-a', label: '3' }, r);
  const path = s.find((x) => x.type === 'path');
  const text = s.find((x) => x.type === 'text');
  assert.ok(path && text);
  assert.equal(text.x, 140);
  assert.ok(text.y < r.y, 'popisek je nad cílem');
  const ys = path.d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 1);
  assert.ok(Math.max(...ys) <= r.y, 'závorka nezasahuje do cíle');
});

test('noteShapes: závorka pod cílem (braceUnder přes position)', () => {
  const r = { x: 0, y: 50, w: 40, h: 20 };
  const s = noteShapes({ kind: 'brace', target: 'bt-a', label: '−2', position: 'below' }, r);
  const text = s.find((x) => x.type === 'text');
  assert.ok(text.y > r.y + r.h, 'popisek je pod cílem');
});

test('noteShapes: dvojité podtržení = dvě čáry pod cílem; škrt přes šířku cíle', () => {
  const r = { x: 10, y: 10, w: 50, h: 30 };
  const du = noteShapes({ kind: 'doubleUnderline', target: 'bt-r' }, r).filter((x) => x.type === 'path');
  assert.equal(du.length, 2);
  const u = noteShapes({ kind: 'underline', target: 'bt-r' }, r).filter((x) => x.type === 'path');
  assert.equal(u.length, 1);
  const st = noteShapes({ kind: 'strike', target: 'bt-r' }, r).filter((x) => x.type === 'path');
  assert.equal(st.length, 1);
  const xs = st[0].d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 0);
  assert.ok(Math.min(...xs) <= 10 && Math.max(...xs) >= 60);
  assert.deepEqual(noteShapes({ kind: 'color', target: 'bt-r' }, r), []);
  assert.deepEqual(noteShapes({ kind: 'neznámé', target: 'bt-r' }, r), []);
});

test('boardForStep: řádky tabule se z kroků sčítají', () => {
  const steps = [{ board: [{ tex: 'a' }] }, { board: [{ tex: 'b' }, { tex: 'c' }] }, { text: 'bez tabule' }, { board: [{ tex: 'd' }] }];
  const r1 = boardForStep(steps, 1);
  assert.equal(r1.lines.length, 4);
  assert.equal(r1.upTo, 3);
  assert.equal(boardForStep(steps, 2), null);
  assert.equal(boardForStep(steps, 3).upTo, 4);
});

test('boardForStep počítá stejné (filtrované) řádky jako drawBoard', () => {
  const steps = [{ board: [null, { tex: 'a' }, 7] }, { board: [{ tex: 'b' }] }, { board: [null] }];
  const r = boardForStep(steps, 1);
  assert.equal(r.lines.length, 2);
  assert.equal(r.upTo, 2);
  assert.equal(boardForStep(steps, 2), null, 'krok jen s neplatnými řádky nemá tabuli');
  const el = dom();
  assert.equal(drawBoard(el, r.lines, r.upTo), 2);
});

test('disposeBoard uvolní tabuli; odpojené tabule se uvolní při dalším kreslení', () => {
  const base = liveBoardCount();
  const a = dom();
  drawBoard(a, LINES, 2);
  assert.equal(liveBoardCount(), base + 1);
  drawBoard(a, LINES, 3); // překreslení téhož el nepřidá další záznam
  assert.equal(liveBoardCount(), base + 1);
  disposeBoard(a);
  assert.equal(liveBoardCount(), base);
  assert.equal(a.querySelector('.board'), null);
  assert.doesNotThrow(() => disposeBoard(a));

  const b = dom();
  drawBoard(b, LINES, 1);
  b.remove(); // odpojeno z DOM bez úklidu
  const c = dom();
  drawBoard(c, LINES, 1);
  assert.equal(liveBoardCount(), base + 1, 'odpojená tabule b se uvolnila');
  relayoutBoards(c.ownerDocument);
  c.remove();
  relayoutBoards(c.ownerDocument);
  assert.equal(liveBoardCount(), base);
});

test('mountStepper.destroy zavolá disposeStepVisual a tabule se uvolní', () => {
  const base = liveBoardCount();
  const el = dom();
  const steps = [{ title: 'A', board: [{ tex: 'a' }] }, { title: 'B', board: [{ tex: 'b' }] }];
  const s = mountStepper(el, steps, {
    renderStepVisual: (t, st, i, all) => { const b = boardForStep(all, i); return !!b && drawBoard(t, b.lines, b.upTo) > 0; },
    disposeStepVisual: disposeBoard,
  });
  s.next();
  assert.equal(el.querySelectorAll('.board-line').length, 2);
  assert.equal(liveBoardCount(), base + 1);
  s.destroy();
  assert.equal(liveBoardCount(), base);
});

test('přepočet poznámek nevytváří prvky znovu (animace se nerestartuje)', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  drawBoard(el, LINES, 2);
  const g1 = el.querySelector('svg .bn');
  assert.ok(g1.classList.contains('is-new'));
  relayoutBoards(el.ownerDocument);
  const g2 = el.querySelector('svg .bn');
  assert.equal(g1, g2);
  assert.equal(el.querySelectorAll('svg .bn').length, 1);
  disposeBoard(el);
  setTexEngine(null);
});

test('vodorovný posun tabule se při změně kroku zachová', () => {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  const store = new WeakMap();
  Object.defineProperty(window.HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get() { return store.get(this) || 0; },
    set(v) { store.set(this, v); },
  });
  const el = window.document.getElementById('r');
  drawBoard(el, LINES, 2);
  const s1 = el.querySelector('.board-scroll');
  s1.scrollLeft = 40;
  s1.dispatchEvent(new window.Event('scroll'));
  drawBoard(el, LINES, 3);
  const s2 = el.querySelector('.board-scroll');
  assert.notEqual(s1, s2);
  assert.equal(s2.scrollLeft, 40);
  drawBoard(el, [{ tex: 'jiný příklad' }], 1);
  assert.equal(el.querySelector('.board-scroll').scrollLeft, 0, 'jiná tabule začíná vlevo');
  disposeBoard(el);
});

test('přístupnost: posuvná oblast je region, poznámky mají textový popis', () => {
  setTexEngine(fakeKatex());
  const el = dom();
  const evil = '<b>3</b>';
  drawBoard(el, [{ tex: '\\htmlClass{bt-a}{x}', notes: [{ kind: 'brace', target: 'bt-a', label: evil }, { kind: 'strike', target: 'bt-nic' }] }], 1);
  assert.equal(el.querySelector('.board-scroll').getAttribute('role'), 'region');
  const items = el.querySelectorAll('.board-sr li');
  assert.equal(items.length, 1, 'jen poznámky s existujícím cílem');
  assert.equal(items[0].textContent, noteDescription({ kind: 'brace', label: evil }));
  assert.match(items[0].textContent, /<b>3<\/b>/);
  assert.equal(el.querySelectorAll('b').length, 0);
  disposeBoard(el);
  setTexEngine(null);
});

test('noteDescription: česky pro všechny druhy', () => {
  assert.equal(noteDescription({ kind: 'brace', label: '3' }), 'Závorka nad částí výrazu, hodnota 3.');
  assert.equal(noteDescription({ kind: 'brace', label: '−2', position: 'below' }), 'Závorka pod částí výrazu, hodnota −2.');
  assert.equal(noteDescription({ kind: 'strike' }), 'Přeškrtnuto, krátí se.');
  assert.equal(noteDescription({ kind: 'doubleUnderline' }), 'Dvojitě podtržený výsledek.');
});

test('css/board.css nemá BOM', () => {
  const buf = readFileSync(new URL('../css/board.css', import.meta.url));
  assert.notDeepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

// Kontrast: počítadlo „Krok N z M“ (barva --chalk) na bílé ploše ve světlém režimu ≥ 4,5 : 1.
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('--chalk má ve světlém režimu kontrast ≥ 4,5 : 1 na bílé i na papíru', () => {
  const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const chalk = /--chalk:\s*(#[0-9a-f]{6})/i.exec(root)[1];
  const paper = /--paper:\s*(#[0-9a-f]{6})/i.exec(root)[1];
  assert.ok(contrast(chalk, '#ffffff') >= 4.5, `kontrast ${contrast(chalk, '#ffffff').toFixed(2)}`);
  assert.ok(contrast(chalk, paper) >= 4.5, `kontrast na papíru ${contrast(chalk, paper).toFixed(2)}`);
});

// KaTeX kreslí \ne jako „=“ s přeškrtnutím ze soukromého znaku U+E020 písma KaTeX_Main (třída .mrel).
// Rukopisné písmo ho nemá; bez KaTeX písem v záložním řetězci se ukázal prázdný čtvereček.
// Stejně ≤, ≥, ≈, ∈, ∪, ∅, ∞: rukopis je jen pro znaky, které písmo má, zbytek z písem KaTeXu.
function cssRules(css) {
  const out = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = Object.fromEntries(m[2].split(';').map((d) => d.split(':')).filter((d) => d.length >= 2)
      .map(([k, ...v]) => [k.trim(), v.join(':').trim()]));
    out.push({ selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), decls });
  }
  return out;
}
function fontsFor(rules, selector) {
  const vars = {};
  for (const r of rules) for (const [k, v] of Object.entries(r.decls)) if (k.startsWith('--')) vars[k] = v;
  let ff = null;
  for (const r of rules) if (r.selectors.includes(selector) && r.decls['font-family']) ff = r.decls['font-family'];
  if (ff === null) return null;
  ff = ff.replace(/var\((--[\w-]+)\)/g, (_, n) => vars[n] ?? '');
  return ff.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
}

test('css/board.css: symboly vzorců na tabuli zůstávají z písem KaTeXu (\ne, \le, \in, \cup …)', () => {
  const rules = cssRules(readFileSync(new URL('../css/board.css', import.meta.url), 'utf8'));
  for (const cls of ['', ' .mrel', ' .mbin', ' .mord', ' .mop', ' .mpunct', ' .mathnormal']) {
    const sel = `.board .katex${cls}`;
    const fonts = fontsFor(rules, sel);
    assert.ok(fonts, `${sel}: chybí font-family`);
    const iMain = fonts.indexOf('KaTeX_Main');
    const iAms = fonts.indexOf('KaTeX_AMS');
    assert.ok(iMain >= 0 && iAms >= 0, `${sel}: v řetězci písem chybí KaTeX_Main/KaTeX_AMS: ${fonts}`);
    // před písmy KaTeXu smí být jen rukopis s omezeným rozsahem znaků (Patrick Hand); systémová
    // záložní písma (Segoe Print, Comic Sans, cursive) by soukromý znak U+E020 nahradila čtverečkem
    const before = fonts.slice(0, Math.min(iMain, iAms));
    assert.deepEqual(before, ['Patrick Hand'], `${sel}: před KaTeX písmy je ${before}`);
  }
  assert.deepEqual(fontsFor(rules, '.board .katex .amsrm')?.[0], 'KaTeX_AMS', 'AMS symboly z KaTeX_AMS');
});
