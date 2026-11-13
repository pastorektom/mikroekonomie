import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  THEMES, THEME_LABELS, STORAGE_KEY, nextTheme, normalizeTheme, applyTheme, loadTheme, saveTheme,
} from '../js/theme.js';

const page = () => new JSDOM(`<!doctype html><html><head>
<meta name="theme-color" content="#eef0f5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0f15" media="(prefers-color-scheme: dark)"></head><body></body></html>`).window.document;
const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test('režimy: podle systému, světlý, tmavý, OLED; každý má český popisek', () => {
  assert.deepEqual(THEMES, ['system', 'light', 'dark', 'oled']);
  for (const t of THEMES) assert.ok(THEME_LABELS[t]);
  assert.match(THEME_LABELS.oled, /OLED/);
});

test('nextTheme prochází režimy dokola; neznámá hodnota se bere jako „podle systému“', () => {
  assert.deepEqual(['system', 'light', 'dark', 'oled'].map(nextTheme), ['light', 'dark', 'oled', 'system']);
  assert.equal(nextTheme('nesmysl'), 'light');
  assert.equal(nextTheme(undefined), 'light');
  assert.equal(normalizeTheme('DARK'), 'system');
  assert.equal(normalizeTheme('dark'), 'dark');
});

test('applyTheme nastaví data-theme (u „podle systému“ ho odstraní) a barvu lišty prohlížeče', () => {
  const doc = page();
  const root = doc.documentElement;
  applyTheme(doc, 'oled');
  assert.equal(root.dataset.theme, 'oled');
  for (const m of doc.querySelectorAll('meta[name="theme-color"]')) assert.equal(m.getAttribute('content'), '#000000');
  applyTheme(doc, 'light');
  assert.equal(root.dataset.theme, 'light');
  for (const m of doc.querySelectorAll('meta[name="theme-color"]')) assert.equal(m.getAttribute('content'), '#eef0f5');
  applyTheme(doc, 'system');
  assert.equal(root.dataset.theme, undefined);
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  assert.deepEqual(metas.map((m) => m.getAttribute('content')), ['#eef0f5', '#0d0f15']);
  assert.deepEqual(metas.map((m) => m.getAttribute('media')), ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
});

test('applyTheme s neplatným režimem se chová jako „podle systému“ a nehodí výjimku', () => {
  const doc = page();
  assert.doesNotThrow(() => applyTheme(doc, 'xyz'));
  assert.equal(doc.documentElement.dataset.theme, undefined);
  assert.doesNotThrow(() => applyTheme(new JSDOM('<!doctype html><html></html>').window.document, 'dark'));
});

test('loadTheme / saveTheme: uložení do úložiště, „podle systému“ klíč smaže, vadné úložiště nevadí', () => {
  const st = store();
  assert.equal(loadTheme(st), 'system');
  saveTheme(st, 'dark');
  assert.equal(st.m.get(STORAGE_KEY), 'dark');
  assert.equal(loadTheme(st), 'dark');
  saveTheme(st, 'system');
  assert.equal(st.m.has(STORAGE_KEY), false);
  assert.equal(loadTheme(store({ [STORAGE_KEY]: 'blbost' })), 'system');
  const broken = { getItem() { throw new Error('blokováno'); }, setItem() { throw new Error('blokováno'); }, removeItem() { throw new Error('blokováno'); } };
  assert.equal(loadTheme(broken), 'system');
  assert.doesNotThrow(() => saveTheme(broken, 'dark'));
  assert.equal(loadTheme(null), 'system');
});
