import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { draw, drawEcon, curvePoints } from '../js/viz/econ.js';
import { drawViz, VIZ_KINDS } from '../js/viz/index.js';

const svgEl = () => {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  return { doc: window.document, svg: window.document.createElementNS('http://www.w3.org/2000/svg', 'svg'), host: window.document.getElementById('r') };
};

// Poptávka Qd=100−2P zapsaná jako P(Q)=50−Q/2, nabídka Qs=10+P jako P(Q)=Q−10.
const market = {
  axes: { x: 'Q', y: 'P' }, domain: [0, 100], range: [0, 60],
  curves: [
    { expr: '50 - x/2', label: 'D0', color: 'blue' },
    { expr: '70 - x/2', label: 'D1', color: 'accent', dashed: true },
    { expr: 'x - 10', label: 'S', color: 'chalk' },
  ],
  arrows: [{ from: [40, 30], to: [50, 35], label: 'posun' }],
  points: [{ x: 40, y: 30, label: 'E', guides: true }],
};

test('drawEcon: posun D0→D1 a nabídka mají tři křivky, šipku, popisky a bod s vodicími čarami', () => {
  const { svg } = svgEl();
  assert.equal(drawEcon(svg, market), true);
  assert.equal(svg.querySelectorAll('path.viz-curve').length, 3);
  assert.equal(svg.querySelectorAll('.viz-arrow').length >= 1, true);
  const text = [...svg.querySelectorAll('text')].map((t) => t.textContent).join(' ');
  for (const s of ['D0', 'D1', 'S', 'E', 'Q', 'P', 'posun']) assert.ok(text.includes(s), `chybí popisek ${s}`);
  assert.ok(svg.querySelector('.viz-guide'), 'vodicí čáry bodu');
  assert.ok(svg.querySelector('path.viz-curve[stroke-dasharray]'), 'čárkovaná křivka');
});

test('draw je totéž co drawEcon a modul je zaregistrovaný jako druh „econ“', () => {
  assert.equal(draw, drawEcon);
  assert.ok(VIZ_KINDS.has('econ'));
  const { host } = svgEl();
  assert.equal(drawViz(host, { kind: 'econ', data: market }), true);
  assert.ok(host.querySelector('.viz-board svg path.viz-curve'));
});

test('prázdná nebo vadná data se nevykreslí a nehodí výjimku', () => {
  for (const bad of [undefined, null, {}, { curves: [] }, { domain: [0, 10], range: [0, 10], curves: [] }, { domain: [5, 5], range: [0, 1], curves: [{ expr: 'x' }] }, 'x', []]) {
    const { svg } = svgEl();
    assert.equal(drawEcon(svg, bad), false);
    assert.equal(svg.querySelectorAll('path.viz-curve').length, 0);
  }
});

test('curvePoints: poptávka klesá, nabídka roste (test sklonu z vykreslených bodů)', () => {
  const d = curvePoints({ expr: '50 - x/2' }, [0, 100], [0, 60]).flat();
  const s = curvePoints({ expr: 'x - 10' }, [0, 100], [0, 60]).flat();
  for (let i = 1; i < d.length; i++) assert.ok(d[i][1] < d[i - 1][1], 'D klesá');
  for (let i = 1; i < s.length; i++) assert.ok(s[i][1] > s[i - 1][1], 'S roste');
});

test('curvePoints: mimo definiční obor se křivka přeruší (sqrt záporného čísla), v cestě nejsou NaN', () => {
  const segs = curvePoints({ expr: 'sqrt(x - 5)' }, [0, 20], [0, 10]);
  assert.ok(segs.length >= 1);
  assert.ok(segs.flat().every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(Math.min(...segs.flat().map((p) => p[0])) >= 5 - 1e-9);
  const { svg } = svgEl();
  assert.equal(drawEcon(svg, { domain: [0, 20], range: [0, 10], curves: [{ expr: 'sqrt(x - 5)' }] }), true);
  assert.ok(!/NaN/.test(svg.innerHTML));
});

test('plocha mezi křivkami (přebytek spotřebitele) je vykreslena jako path.viz-area s popiskem', () => {
  const { svg } = svgEl();
  drawEcon(svg, { ...market, areas: [{ between: ['50 - x/2', '30'], from: 0, to: 40, label: 'PS' }] });
  assert.ok(svg.querySelector('path.viz-area'));
  assert.ok([...svg.querySelectorAll('text')].some((t) => t.textContent === 'PS'));
});

test('popisky se vkládají jako text, ne jako HTML', () => {
  const { svg } = svgEl();
  drawEcon(svg, { domain: [0, 10], range: [0, 10], curves: [{ expr: 'x', label: '<img src=x onerror=alert(1)>' }] });
  assert.equal(svg.querySelectorAll('img').length, 0);
  assert.ok([...svg.querySelectorAll('text')].some((t) => t.textContent.includes('<img')));
});

test('výraz s nepovolenou funkcí se nevyhodnotí (křivka se nevykreslí), ostatní ano', () => {
  const { svg } = svgEl();
  drawEcon(svg, { domain: [0, 10], range: [0, 10], curves: [{ expr: 'evaluate("1+1")' }, { expr: 'x' }] });
  assert.equal(svg.querySelectorAll('path.viz-curve').length, 1);
});

test('SVG má české alt, výchozí „Ekonomický graf“, a vlastní alt se použije', () => {
  const a = svgEl().svg; drawEcon(a, market);
  assert.equal(a.getAttribute('aria-label'), 'Ekonomický graf');
  const b = svgEl().svg; drawEcon(b, { ...market, alt: 'Posun poptávky doprava' });
  assert.equal(b.getAttribute('aria-label'), 'Posun poptávky doprava');
});
