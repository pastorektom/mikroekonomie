// Obrazovka Procvičování: zadání, pole pro odpověď, kontrola, zápis pokusu.
// Závislosti (check, record, navigate, rng, now) lze podstrčit přes opts kvůli testům.
import { check as defaultCheck } from '../checker.js';
import { recordAttempt } from '../progress.js';
import { renderTex, renderText, h } from '../render.js';
import { makeRng, randomSeed } from '../rng.js';
import { routeHref } from '../router.js';
import { createAnswerInput, symbolPanel, TEXT_KINDS } from './inputs.js';
import { mountWhiteboard } from './whiteboard.js';
import { drawViz, disposeViz } from '../viz/index.js';

export const MESSAGES = {
  correct: 'Správně!',
  wrong: 'Zatím ne – zkus to znovu.',
  syntax: 'Tomu zápisu nerozumím – zkontroluj závorky a znaménka.',
  unsupported: 'Tuhle odpověď nejde automaticky ověřit. Použij „Ukaž výsledek“ a porovnej.',
  empty: 'Nejdřív něco zadej.',
  failed: 'Příklad se nepodařilo vytvořit. Zkus „Další příklad“.',
};

function num(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(Number(n.toPrecision(10))).replace('.', '{,}');
}

// Správná odpověď pro „Ukaž výsledek“: { tex } nebo { text }.
export function formatAnswer(problem) {
  if (problem.answerTex) return { tex: problem.answerTex };
  const spec = problem.answerSpec || {};
  const { kind, value } = spec;
  const optionText = (id) => (spec.options || []).find((o) => o.id === id)?.text ?? String(id);
  if (kind === 'number') return { tex: `${num(value)}${spec.unit === 'percent' ? '\\,\\%' : ''}` };
  if (kind === 'choice') return { text: optionText(value) };
  if (kind === 'multichoice') return { text: (value || []).map(optionText).join('; ') };
  if (kind === 'truefalse') return { text: value ? 'Pravda' : 'Nepravda' };
  if (kind === 'table' && Array.isArray(value)) {
    const cols = Array.isArray(value[0]) ? value[0].length : 1;
    return { tex: `\\begin{array}{${'c'.repeat(cols)}}${value.map((r) => r.map(num).join(' & ')).join(' \\\\ ')}\\end{array}` };
  }
  if (kind === 'whiteboard') return { text: 'Vzorový graf je vedle tvé kresby.' };
  if (Array.isArray(value)) return { text: value.map((x) => (Array.isArray(x) ? `(${x.join(', ')})` : String(x))).join('; ') };
  return { text: String(value ?? '') };
}

// Pevné příklady ze cvičení (js/content.js) mají typ 'cviceni' a „seed“ = pořadí v seznamu.
export const FIXED_TYPE = 'cviceni';
export const FIXED_TITLE = 'Příklady ze cvičebnice';

// Zdroj příkladu: { chapter, number } z cvičebnice nebo hotový text.
export function sourceText(src) {
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object' && src.chapter != null && src.number != null) {
    return `cvičebnice, kap. ${src.chapter}, úloha ${src.number}`;
  }
  return '';
}

export function buildFixedProblem(topic, list, index) {
  const i = ((index % list.length) + list.length) % list.length;
  const f = list[i];
  return { ...f, topic: topic.id, type: FIXED_TYPE, sourceType: f.type, seed: i };
}

// Seed -> typ (při volbě „Všechny typy“) a příklad; stejný seed dá vždy stejný příklad.
export function buildProblem(topic, seed, typeId) {
  const types = topic.types;
  const type = types.find((t) => t.id === typeId) || types[Math.floor(makeRng(seed ^ 0x9e3779b9)() * types.length)];
  const problem = type.generate(makeRng(seed));
  return { ...problem, topic: problem.topic ?? topic.id, type: type.id, seed };
}

export function mountPractice(el, topic, opts = {}) {
  const doc = el.ownerDocument;
  const check = opts.check || defaultCheck;
  const record = opts.record || recordAttempt;
  const now = opts.now || (() => Date.now());
  const navigate = opts.navigate || ((r) => { doc.defaultView.location.hash = routeHref(r.id, 'postup', r); });
  const nextSeed = opts.rng ? () => Math.floor(opts.rng() * 4294967296) >>> 0 : randomSeed;
  const types = Array.isArray(topic.types) ? topic.types : [];
  el.textContent = '';

  if (types.length === 0) {
    el.appendChild(h(doc, 'p', { class: 'empty', text: 'Procvičování k tomuto tématu se připravuje.' }));
    return { get problem() { return null; }, destroy() {} };
  }

  let selected = null; // null = všechny typy, FIXED_TYPE = příklady ze cvičení
  let fixed = [];
  let fixedIndex = -1;
  let problem = null;
  let shownAt = 0;
  let finished = false;
  let answerInput = null;
  let board = null;
  let boardBtn = null;

  let picker = types.length > 1 ? h(doc, 'div', { class: 'type-picker', role: 'group', 'aria-label': 'Typ příkladu' }) : null;
  const prompt = h(doc, 'div', { class: 'prompt' });
  const toolsSlot = h(doc, 'div', { class: 'practice-tools', 'data-slot': 'tabule' });
  const boardBox = h(doc, 'div', { class: 'practice-board', 'data-role': 'board', hidden: true });
  const answerBox = h(doc, 'div', { class: 'answer-box' });
  const feedback = h(doc, 'p', { class: 'feedback', 'data-role': 'feedback', 'aria-live': 'polite' });
  const revealBox = h(doc, 'div', { class: 'reveal-box', 'data-role': 'reveal-box', hidden: true });
  const checkBtn = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-role': 'check', text: 'Zkontrolovat' });
  const revealBtn = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'reveal', text: 'Ukaž výsledek' });
  const nextBtn = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'next', text: 'Další příklad' });
  const solutionBtn = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'solution', text: 'Ukaž postup' });
  const stepperSlot = h(doc, 'div', { class: 'practice-stepper', 'data-slot': 'postup' });
  const root = h(doc, 'section', { class: 'practice', 'aria-label': 'Procvičování' }, [
    picker, prompt, toolsSlot, answerBox, boardBox, feedback, revealBox,
    h(doc, 'div', { class: 'practice-buttons' }, [checkBtn, revealBtn]),
    h(doc, 'div', { class: 'practice-buttons practice-more' }, [nextBtn, solutionBtn]),
    stepperSlot,
  ]);
  el.appendChild(root);

  function say(kind, text) {
    feedback.textContent = text;
    feedback.className = `feedback ${kind}`;
  }

  function markPicker() {
    if (!picker) return;
    [...picker.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === (selected ?? ''))));
  }

  function closeBoard() {
    board?.destroy();
    board = null;
    boardBox.textContent = '';
    boardBox.hidden = true;
    root.classList.remove('has-board');
    boardBtn?.setAttribute('aria-pressed', 'false');
  }

  function openBoard() {
    if (!board) board = mountWhiteboard(boardBox);
    boardBox.hidden = false;
    root.classList.add('has-board');
    boardBtn?.setAttribute('aria-pressed', 'true');
  }

  // Skrytí tabule kresbu zachová; zničí se až u dalšího příkladu.
  function hideBoard() {
    boardBox.hidden = true;
    root.classList.remove('has-board');
    boardBtn?.setAttribute('aria-pressed', 'false');
  }

  function isBoard() { return problem?.answerSpec?.kind === 'whiteboard'; }

  function lock(v) {
    finished = v;
    revealBtn.disabled = v;
    answerInput?.setDisabled(v);
    checkBtn.disabled = v;
  }

  function show(seed, typeId) {
    revealBox.hidden = true;
    disposeViz(revealBox);
    revealBox.textContent = '';
    stepperSlot.textContent = '';
    toolsSlot.textContent = '';
    closeBoard();
    boardBtn = null;
    checkBtn.hidden = false;
    revealBtn.disabled = false;
    say('', '');
    disposeViz(prompt);
    try {
      problem = typeId === FIXED_TYPE ? buildFixedProblem(topic, fixed, seed) : buildProblem(topic, seed, typeId);
    } catch {
      problem = null;
      prompt.textContent = '';
      answerBox.textContent = '';
      say('wrong', MESSAGES.failed);
      lock(true);
      return;
    }
    prompt.textContent = '';
    const type = types.find((t) => t.id === problem.type);
    const labelText = problem.type === FIXED_TYPE
      ? `${FIXED_TITLE}: ${problem.seed + 1} z ${fixed.length}${sourceText(problem.source) ? `, ${sourceText(problem.source)}` : ''}`
      : type?.title || '';
    prompt.appendChild(h(doc, 'p', { class: 'prompt-label', text: labelText }));
    const f = h(doc, 'div', { class: 'formula' });
    renderTex(f, problem.promptTex, { display: true });
    if (problem.task) prompt.appendChild(renderText(h(doc, 'div', { class: 'prompt-task prose', 'data-role': 'task' }), problem.task));
    prompt.appendChild(f);
    // problem.promptViz = { kind, data }: graf k zadání (např. „Limity z grafu“) pod vzorcem v rámu tabule
    if (problem.promptViz) {
      const pv = h(doc, 'div', { class: 'prompt-viz', 'data-role': 'prompt-viz' });
      if (drawViz(pv, problem.promptViz)) prompt.appendChild(pv);
    }
    if (problem.hint) prompt.appendChild(h(doc, 'p', { class: 'prompt-hint', text: problem.hint }));

    answerBox.textContent = '';
    if (isBoard()) {
      // Tabule místo textového pole; správnost posoudí student sám po „Ukaž výsledek“.
      checkBtn.hidden = true;
      answerInput = { inputs: [], setDisabled() {}, hasEmpty: () => false, getValue: () => '' };
      openBoard();
    } else {
      answerInput = createAnswerInput(doc, problem.answerSpec, { onSubmit: submit });
      const field = h(doc, 'div', { class: 'answer-field', 'data-role': 'answer' }, answerInput.el);
      if (TEXT_KINDS.has(problem.answerSpec?.kind)) {
        const sym = symbolPanel(doc, answerInput.inputs, { coarse: opts.coarse });
        answerBox.append(h(doc, 'div', { class: 'answer-row' }, [field, sym.toggle]), sym.panel);
      } else {
        answerBox.append(h(doc, 'div', { class: 'answer-row' }, field));
      }
      boardBtn = h(doc, 'button', {
        type: 'button', class: 'btn btn-quiet', 'data-role': 'tabule', 'aria-pressed': 'false',
        'aria-label': 'Tabule: zobrazit nebo skrýt kreslicí plochu', text: 'Tabule',
        onclick: () => (board && !boardBox.hidden ? hideBoard() : openBoard()),
      });
      toolsSlot.appendChild(boardBtn);
    }
    lock(false);
    shownAt = now();
    markPicker();
    if (typeof opts.onProblem === 'function') opts.onProblem({ problem, toolsSlot, stepperSlot });
  }

  function newProblem() {
    if (selected === FIXED_TYPE && fixed.length) {
      fixedIndex = (fixedIndex + 1) % fixed.length;
      show(fixedIndex, FIXED_TYPE);
    } else show(nextSeed(), selected);
  }

  function submit() {
    if (!problem || finished) return;
    if (answerInput.hasEmpty()) { say('hint', MESSAGES.empty); return; }
    const value = answerInput.getValue();
    const ms = now() - shownAt;
    const r = check(problem.answerSpec, value);
    if (r.ok) {
      say('ok', problem.conclusion ? `${MESSAGES.correct} ${problem.conclusion}` : MESSAGES.correct);
      logWith(true, value, ms);
      lock(true);
      nextBtn.focus();
    } else if (r.reason === 'syntax') {
      say('hint', MESSAGES.syntax); // zápis nejde přečíst, takže to není pokus
    } else if (r.reason === 'unsupported') {
      say('hint', MESSAGES.unsupported);
    } else {
      say('wrong', MESSAGES.wrong);
      logWith(false, value, ms);
    }
  }

  function logWith(correct, value, ms, extra = {}) {
    const answer = typeof value === 'string' ? value : JSON.stringify(value);
    Promise.resolve(record({
      topic: problem.topic, type: problem.type, seed: problem.seed, answer, correct, ms, ...extra,
    })).catch(() => {});
  }

  function reveal() {
    if (!problem || finished || revealBox.hidden === false) return;
    const ms = now() - shownAt;
    if (isBoard()) { revealBoard(); return; }
    // „Ukaž výsledek“ se zapisuje jako nezodpovězený příklad (correct:false, revealed:true).
    logWith(false, { revealed: true }, ms);
    const a = formatAnswer(problem);
    revealBox.textContent = '';
    revealBox.appendChild(h(doc, 'p', { class: 'reveal-label', text: 'Správný výsledek' }));
    const body = h(doc, 'div', { class: 'reveal-value' });
    if (a.tex != null) renderTex(body, a.tex, { display: true });
    else body.textContent = a.text;
    revealBox.appendChild(body);
    revealBox.hidden = false;
    say('hint', `${problem.conclusion ? `${problem.conclusion} ` : ''}Výsledek je ukázaný. Zkus další příklad, nebo si ukaž postup.`);
    lock(true);
    nextBtn.focus();
  }

  // Tabule: správné řešení vedle kresby, student se hodnotí sám (zapíše se jeden pokus, selfGraded).
  function revealBoard() {
    const a = formatAnswer(problem);
    revealBox.textContent = '';
    revealBox.appendChild(h(doc, 'p', { class: 'reveal-label', text: 'Správný výsledek' }));
    const body = h(doc, 'div', { class: 'reveal-value' });
    if (a.tex != null) renderTex(body, a.tex, { display: true });
    else body.textContent = a.text;
    const grade = (correct) => {
      if (finished) return;
      logWith(correct, { selfGraded: true }, now() - shownAt, { selfGraded: true });
      lock(true);
      selfRow.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      say('hint', correct ? 'Zapsáno jako zvládnuté.' : 'Zapsáno. Zkus další příklad, nebo si ukaž postup.');
      nextBtn.focus();
    };
    const selfRow = h(doc, 'div', { class: 'practice-buttons' }, [
      h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-role': 'self-ok', 'aria-label': 'Zvládl jsem', text: 'Zvládl jsem', onclick: () => grade(true) }),
      h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'self-bad', 'aria-label': 'Nezvládl jsem', text: 'Nezvládl jsem', onclick: () => grade(false) }),
    ]);
    revealBox.append(body);
    // Vzorový graf (answerSpec.reference = { kind, data }) vedle kresby studenta.
    const ref = problem.answerSpec?.reference;
    if (ref) {
      const rv = h(doc, 'div', { class: 'reveal-viz', 'data-role': 'reveal-viz' });
      if (drawViz(rv, ref)) revealBox.appendChild(rv);
    }
    revealBox.append(selfRow);
    revealBox.hidden = false;
    revealBtn.disabled = true;
    say('hint', 'Porovnej s tabulí a označ, jak ti to šlo.');
  }

  checkBtn.addEventListener('click', submit);
  revealBtn.addEventListener('click', reveal);
  nextBtn.addEventListener('click', newProblem);
  solutionBtn.addEventListener('click', () => {
    if (problem) navigate({ id: topic.id, seed: problem.seed, type: problem.type });
  });

  if (picker) {
    const choices = [{ id: '', title: 'Všechny typy' }, ...types];
    for (const t of choices) {
      picker.appendChild(h(doc, 'button', {
        type: 'button', class: 'chip', 'data-type': t.id, 'data-role': t.id ? `type-${t.id}` : 'type-all', text: t.title,
        onclick: () => { selected = t.id || null; newProblem(); },
      }));
    }
  }

  newProblem();

  // Pevné příklady se načítají asynchronně; volba „Příklady ze cvičebnice“ se přidá, jen když nějaké jsou.
  function setFixed(list) {
    fixed = Array.isArray(list) ? list.filter((p) => p && p.promptTex && p.answerSpec) : [];
    picker?.querySelector('[data-role="type-cviceni"]')?.remove();
    if (!fixed.length) return;
    if (!picker) {
      picker = h(doc, 'div', { class: 'type-picker', role: 'group', 'aria-label': 'Typ příkladu' });
      root.insertBefore(picker, prompt);
      picker.appendChild(h(doc, 'button', {
        type: 'button', class: 'chip', 'data-type': '', 'data-role': 'type-all', text: types.length > 1 ? 'Všechny typy' : types[0].title,
        onclick: () => { selected = null; newProblem(); },
      }));
    }
    picker.appendChild(h(doc, 'button', {
      type: 'button', class: 'chip', 'data-type': FIXED_TYPE, 'data-role': 'type-cviceni', text: FIXED_TITLE,
      onclick: () => { selected = FIXED_TYPE; fixedIndex = -1; newProblem(); },
    }));
    markPicker();
  }

  return {
    setFixed,
    get problem() { return problem; },
    destroy() { closeBoard(); disposeViz(prompt); disposeViz(revealBox); el.textContent = ''; },
  };
}
