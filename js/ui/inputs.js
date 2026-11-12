// Vstupní pole pro odpovědi: jedno pole (číslo, výraz, seznam), mřížka políček (tabulka),
// přepínače (choice, truefalse), zaškrtávací políčka (multichoice) a panel znaků pro výrazy.
// Pole mají nastavení vhodná pro matematiku na iOS/Androidu: žádné automatické velké písmeno,
// opravy ani kontrola pravopisu; inputmode je záměrně „text“, protože desetinná klávesnice
// na iPhonu nemá minus ani lomítko.
import { h } from '../render.js';

export const SYMBOLS = [
  { label: '^', insert: '^', title: 'Mocnina' },
  { label: '/', insert: '/', title: 'Zlomek' },
  { label: '%', insert: '%', title: 'Procento' },
  { label: '(', insert: '(', title: 'Levá závorka' },
  { label: ')', insert: ')', title: 'Pravá závorka' },
];

// Panel znaků se ukazuje jen u odpovědí, které se píšou (ne u výběru z možností).
export const TEXT_KINDS = new Set(['number', 'expression', 'table', 'list']);

export function symbolsFor() {
  return SYMBOLS;
}

export function mathField(doc, attrs = {}) {
  return h(doc, 'input', {
    type: 'text', class: 'answer-input',
    inputmode: 'text', enterkeyhint: 'done',
    autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
    ...attrs,
  });
}

function bindEnter(input, onSubmit) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (onSubmit) onSubmit(); }
  });
}

// Mřížka rows × cols; getValue() vrací pole polí řetězců.
export function matrixInput(rows, cols, doc = document, { onSubmit } = {}) {
  const inputs = [];
  const grid = h(doc, 'div', { class: 'matrix-input', role: 'group', 'aria-label': `Tabulka ${rows} × ${cols}`, style: `--cols:${cols}` });
  for (let i = 0; i < rows; i++) {
    inputs.push([]);
    for (let j = 0; j < cols; j++) {
      const input = mathField(doc, { class: 'answer-input cell', 'aria-label': `Řádek ${i + 1}, sloupec ${j + 1}`, size: 3 });
      bindEnter(input, onSubmit);
      inputs[i].push(input);
      grid.appendChild(input);
    }
  }
  const wrap = h(doc, 'div', { class: 'matrix-scroll' }, grid);
  return {
    el: wrap,
    inputs: inputs.flat(),
    getValue: () => inputs.map((r) => r.map((c) => c.value)),
  };
}

// Výběr z možností: radio (choice, truefalse) nebo zaškrtávací políčka (multichoice). Hodnoty jsou id možností.
function optionInput(doc, type, options, label, { onSubmit } = {}) {
  const name = `opt-${Math.random().toString(36).slice(2, 8)}`;
  const inputs = [];
  const box = h(doc, 'div', { class: 'option-list', role: type === 'radio' ? 'radiogroup' : 'group', 'aria-label': label });
  for (const o of options) {
    const input = h(doc, 'input', { type, name, value: String(o.id) });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && onSubmit) { e.preventDefault(); onSubmit(); } });
    inputs.push(input);
    box.appendChild(h(doc, 'label', { class: 'option' }, [input, h(doc, 'span', { text: o.text })]));
  }
  return { el: box, inputs, checked: () => inputs.filter((i) => i.checked).map((i) => i.value) };
}

// Vytvoří pole podle druhu odpovědi. Vrací { el, inputs, getValue, hasEmpty, isEmpty, setDisabled, focus, clear }.
// getValue(): text (number, expression), pole polí (table), pole textů (list, multichoice),
// id možnosti (choice) nebo true/false (truefalse; null, dokud nic nevybral).
export function createAnswerInput(doc, spec, { onSubmit } = {}) {
  const kind = spec?.kind;
  const v = spec?.value;
  const flat = (x) => (Array.isArray(x) ? x.flatMap(flat) : [x]);
  let part;
  let empty = null;
  if (kind === 'choice') {
    const o = optionInput(doc, 'radio', spec.options || [], 'Vyber jednu odpověď', { onSubmit });
    part = { ...o, getValue: () => o.checked()[0] ?? '' };
    empty = () => part.getValue() === '';
  } else if (kind === 'multichoice') {
    const o = optionInput(doc, 'checkbox', spec.options || [], 'Vyber všechny správné odpovědi', { onSubmit });
    part = { ...o, getValue: () => o.checked() };
    empty = () => part.getValue().length === 0;
  } else if (kind === 'truefalse') {
    const o = optionInput(doc, 'radio', [{ id: 'true', text: 'Pravda' }, { id: 'false', text: 'Nepravda' }], 'Pravda, nebo nepravda?', { onSubmit });
    part = { ...o, getValue: () => { const c = o.checked()[0]; return c === undefined ? null : c === 'true'; } };
    empty = () => part.getValue() === null;
  } else if (kind === 'table' && Array.isArray(v) && Array.isArray(v[0])) {
    part = matrixInput(v.length, v[0].length, doc, { onSubmit });
  } else if (kind === 'list') {
    const input = mathField(doc, { 'aria-label': 'Tvoje odpověď', placeholder: 'Čísla oddělená středníkem, např. 2; 5' });
    bindEnter(input, onSubmit);
    part = { el: input, inputs: [input], getValue: () => input.value.split(';').map((x) => x.trim()).filter((x) => x !== '') };
    empty = () => part.getValue().length === 0;
  } else {
    const input = mathField(doc, { 'aria-label': 'Tvoje odpověď', placeholder: 'Odpověď' });
    bindEnter(input, onSubmit);
    part = { el: input, inputs: [input], getValue: () => input.value };
  }
  const textEmpty = (any) => () => flat(part.getValue())[any ? 'some' : 'every']((s) => String(s).trim() === '');
  return {
    ...part,
    hasEmpty: empty || textEmpty(true),
    isEmpty: empty || textEmpty(false),
    setDisabled(d) { part.inputs.forEach((i) => { i.disabled = d; }); },
    focus() { part.inputs[0]?.focus(); },
    clear() { part.inputs.forEach((i) => { if (i.type === 'radio' || i.type === 'checkbox') i.checked = false; else i.value = ''; }); },
  };
}

// Vloží text na místo kurzoru v poli a přesune kurzor.
export function insertAtCaret(input, text, caret = text.length) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const pos = start + caret;
  try { input.setSelectionRange(pos, pos); } catch { /* pole nemusí podporovat výběr */ }
  input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true }));
}

// Panel znaků; vkládá do naposledy vybraného pole z `inputs`. Na dotykových zařízeních
// je vidět hned, jinde se zapíná tlačítkem „Znaky“.
// kind = answerSpec.kind (u intervalu přibudou <, >, ∪, ∅, ln, e).
export function symbolPanel(doc, inputs, { coarse, kind } = {}) {
  const win = doc.defaultView;
  const isCoarse = coarse ?? !!win?.matchMedia?.('(pointer: coarse)').matches;
  let last = inputs[0] || null;
  inputs.forEach((i) => i.addEventListener('focus', () => { last = i; }));
  const panel = h(doc, 'div', { class: 'symbol-panel', id: `sym-${Math.random().toString(36).slice(2, 8)}`, role: 'group', 'aria-label': 'Znaky pro zápis' });
  for (const s of symbolsFor(kind)) {
    const b = h(doc, 'button', { type: 'button', class: 'sym-btn', 'aria-label': s.title, title: s.title, text: s.label });
    // Tlačítko nesmí sebrat zaměření poli, jinak by zmizela klávesnice i kurzor.
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') e.preventDefault(); });
    b.addEventListener('click', () => {
      const target = last || inputs[0];
      if (!target || target.disabled) return;
      target.focus();
      insertAtCaret(target, s.insert, s.caret);
    });
    panel.appendChild(b);
  }
  const toggle = h(doc, 'button', {
    type: 'button', class: 'btn btn-quiet sym-toggle', 'aria-controls': panel.id,
    'aria-expanded': String(isCoarse), text: 'Znaky',
  });
  panel.hidden = !isCoarse;
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  return { panel, toggle };
}
