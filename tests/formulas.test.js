import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import { FORMULAS, DISCLAIMER } from '../js/formulas.js';
import { renderFormulas } from '../js/ui/formulas.js';
import { setTexEngine } from '../js/render.js';
import { topics } from '../js/topics/index.js';

const all = FORMULAS.flatMap((g) => g.items.map((it) => ({ group: g.topic, ...it })));

test('každý vzorec se vykreslí KaTeXem bez chyby', () => {
  assert.ok(all.length >= 40, `málo vzorců: ${all.length}`);
  for (const f of all) {
    assert.doesNotThrow(() => katex.renderToString(f.tex, { throwOnError: true }), `${f.group}: ${f.name}: ${f.tex}`);
  }
});

test('skupiny odpovídají tématům aplikace (id existuje, pořadí podle témat) a mají aspoň 4 vzorce', () => {
  const ids = topics.map((t) => t.id);
  let last = -1;
  for (const g of FORMULAS) {
    assert.ok(ids.includes(g.topic), `neznámé téma ${g.topic}`);
    const i = ids.indexOf(g.topic);
    assert.ok(i > last, 'pořadí skupin neodpovídá pořadí témat');
    last = i;
    assert.ok(g.items.length >= 4, `${g.topic}: málo vzorců`);
  }
});

test('každý vzorec má název a tex, názvy v rámci skupiny jsou jedinečné', () => {
  for (const g of FORMULAS) {
    const names = g.items.map((i) => i.name);
    assert.equal(new Set(names).size, names.length, `${g.topic}: opakují se názvy`);
    for (const it of g.items) assert.ok(it.name.trim() && it.tex.trim());
  }
});

test('přehled je označen jako vlastní a neoficiální', () => {
  assert.match(DISCLAIMER, /neoficiální/i);
});

test('renderFormulas vykreslí upozornění, všechny skupiny a vzorce, text se nevkládá jako HTML', () => {
  const { window } = new JSDOM('<!doctype html><div id="r"></div>');
  setTexEngine(katex);
  const el = window.document.getElementById('r');
  renderFormulas(el);
  assert.match(el.textContent, /neoficiální/i);
  assert.equal(el.querySelectorAll('section.formula-group').length, FORMULAS.length);
  assert.equal(el.querySelectorAll('.formula-item').length, all.length);
  assert.equal(el.querySelectorAll('.katex-error').length, 0);
  assert.equal(el.querySelectorAll('script,img').length, 0);
});

test('názvy a poznámky nemají podtržítko mimo vzorec ($…$)', () => {
  const outside = (s) => s.replace(/\$[^$]*\$/g, '');
  for (const f of all) {
    for (const text of [f.name, f.note || '']) assert.ok(!/_/.test(outside(text)), `${f.group}: „${text}“ má „_“ mimo vzorec`);
  }
});

test('přehled vzorců pokrývá všech 11 témat', () => {
  assert.deepEqual(FORMULAS.map((g) => g.topic), topics.map((t) => t.id));
});
