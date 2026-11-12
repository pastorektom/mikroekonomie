// Ověření tématu: pro každý typ příkladu vygeneruje n příkladů a zkontroluje, že jsou použitelné a správné.
//
// verify(topic, { n = 500, independent = {}, minDistinct = {} })
//   independent[typeId](problem) → očekávaná správná hodnota spočtená NEZÁVISLE na generátoru
//   (jiným postupem, např. hrubým prohledáním), porovná se s problem.answerSpec.value.
//   minDistinct[typeId] = nejmenší počet různých zadání mezi n příklady (kontrola variability).
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { makeRng } from '../../js/rng.js';
import { check } from '../../js/checker.js';
import { drawEcon } from '../../js/viz/econ.js';

const doc = new JSDOM('<!doctype html><body></body>').window.document;
const svg = () => doc.createElementNS('http://www.w3.org/2000/svg', 'svg');

// Vstup, který by zadal student se správnou odpovědí.
export function correctInput(spec) {
  switch (spec.kind) {
    case 'number': return spec.unit === 'percent' ? `${spec.value} %` : String(spec.value);
    case 'list': return spec.value.map(String);
    default: return spec.value;
  }
}

const sameValue = (a, b) => (typeof a === 'number' && typeof b === 'number'
  ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  : JSON.stringify([a].flat().sort?.() ?? a) === JSON.stringify([b].flat().sort?.() ?? b));

function checkSteps(p, where) {
  assert.ok(Array.isArray(p.solution) && p.solution.length >= 3, `${where}: postup má mít aspoň 3 kroky`);
  for (const [i, s] of p.solution.entries()) {
    assert.ok(typeof s.title === 'string' && s.title.trim(), `${where}: krok ${i + 1} bez názvu`);
    assert.ok(typeof s.text === 'string' && s.text.trim(), `${where}: krok ${i + 1} bez popisu`);
    const hasBoard = Array.isArray(s.board) && s.board.length > 0;
    assert.ok(hasBoard || s.viz, `${where}: krok ${i + 1} nemá tabuli ani graf`);
    if (hasBoard) for (const l of s.board) assert.ok(typeof l.tex === 'string' && l.tex.trim(), `${where}: prázdný řádek tabule`);
    if (s.viz?.kind === 'econ') assert.equal(drawEcon(svg(), s.viz.data), true, `${where}: graf kroku ${i + 1} se nevykreslil`);
  }
  const hasResultLine = p.solution.some((s) => (s.board || []).some((l) => (l.notes || []).some((n) => n.kind === 'doubleUnderline')));
  assert.ok(hasResultLine || p.answerSpec.kind === 'whiteboard', `${where}: žádný řádek s výsledkem (dvojité podtržení)`);
}

export function verify(topic, { n = 500, independent = {}, minDistinct = {} } = {}) {
  assert.ok(topic.types.length > 0, 'téma nemá žádné typy příkladů');
  for (const type of topic.types) {
    const tasks = new Set();
    for (let seed = 1; seed <= n; seed++) {
      const where = `${topic.id}/${type.id} seed ${seed}`;
      const p = type.generate(makeRng(seed));
      assert.deepEqual(type.generate(makeRng(seed)), p, `${where}: stejný seed nedal stejný příklad`);
      assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(p)), `${where}: v příkladu je NaN/undefined/Infinity`);
      assert.ok(p.task || p.promptTex, `${where}: bez zadání`);
      assert.ok(p.part === 'zkouska' || p.part === 'zapocet', `${where}: part musí být zapocet nebo zkouska`);
      assert.ok(Number.isFinite(p.points) && p.points > 0, `${where}: points`);
      tasks.add(`${p.task}|${p.promptTex}|${JSON.stringify(p.answerSpec?.reference ?? '')}`);
      const spec = p.answerSpec;
      assert.ok(spec && spec.kind, `${where}: bez answerSpec`);
      checkSteps(p, where);

      if (spec.kind === 'whiteboard') {
        assert.equal(spec.reference?.kind, 'econ', `${where}: tabule bez vzorového grafu`);
        assert.equal(drawEcon(svg(), spec.reference.data), true, `${where}: vzorový graf se nevykreslil`);
        continue;
      }
      assert.equal(check(spec, correctInput(spec)).ok, true, `${where}: správná odpověď neprošla kontrolou`);
      if (spec.options) {
        const ids = spec.options.map((o) => o.id);
        assert.equal(new Set(ids).size, ids.length, `${where}: id možností se opakují`);
        assert.ok(ids.length >= 2, `${where}: méně než dvě možnosti`);
        for (const v of [spec.value].flat()) assert.ok(ids.includes(v), `${where}: správná odpověď není mezi možnostmi`);
      }
      if (spec.kind === 'number') {
        const last = p.solution[p.solution.length - 1];
        const shown = String(Math.round(spec.value * 1e6) / 1e6).replace('.', ',').replace('-', '−');
        assert.ok(`${last.text} ${p.conclusion || ''}`.includes(shown), `${where}: závěr postupu neobsahuje výsledek ${shown}`);
      }
      if (independent[type.id]) {
        const expected = independent[type.id](p);
        assert.ok(sameValue(expected, spec.value), `${where}: nezávislý výpočet ${JSON.stringify(expected)} ≠ ${JSON.stringify(spec.value)}`);
      }
    }
    const need = minDistinct[type.id] ?? 2;
    assert.ok(tasks.size >= need, `${topic.id}/${type.id}: jen ${tasks.size} různých zadání z ${n} (čekáno ${need})`);
  }
}
