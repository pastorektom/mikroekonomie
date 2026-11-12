// Kontrola odpovědí podle answerSpec. ES modul funguje v Node (testy) i v prohlížeči.
// math.js se importuje jako 'mathjs' (v prohlížeči přes import map v index.html).
//
// check(answerSpec, input) vrací { ok: true } | { ok: false, reason: 'syntax'|'wrong'|'unsupported' }.
// Druhy: number, expression, choice, multichoice, truefalse, table, list.
// 'whiteboard' (ručně kreslený graf) se nikdy nekontroluje automaticky.
import {
  SYNTAX, WRONG, UNSUPPORTED, TOL, parse, usesBlocked, normalize, parseNumber, close, fail,
} from './checker-core.js';

const OK = { ok: true };

// Shoda dvou čísel: bez tolerance přesně (relativně 1e-9), s tolerancí `tol` absolutně.
function same(a, b, tol) {
  return tol ? Math.abs(a - b) <= tol + 1e-12 : close(a, b);
}

// Přečte číslo z textu; u procent odřízne koncové „%“.
function readNumber(input, spec) {
  let text = input;
  if (typeof text === 'string' && spec && spec.unit === 'percent') text = text.replace(/\s*%\s*$/, '');
  return parseNumber(text);
}

function checkNumber(spec, input) {
  const r = readNumber(input, spec);
  if (r.err) return fail(r.err);
  const want = Number(spec.value);
  const got = spec.abs ? Math.abs(r.v) : r.v;
  return same(got, spec.abs ? Math.abs(want) : want, spec.tol) ? OK : WRONG;
}

function checkChoice(spec, input) {
  if (typeof input !== 'string' || input === '') return SYNTAX;
  return input === spec.value ? OK : WRONG;
}

function checkMultichoice(spec, input) {
  if (!Array.isArray(input)) return SYNTAX;
  const got = new Set(input);
  const want = new Set(spec.value);
  if (got.size !== want.size) return WRONG;
  for (const id of want) if (!got.has(id)) return WRONG;
  return OK;
}

function checkTrueFalse(spec, input) {
  if (typeof input !== 'boolean') return SYNTAX;
  return input === spec.value ? OK : WRONG;
}

function checkTable(spec, input) {
  if (!Array.isArray(input) || input.some((row) => !Array.isArray(row))) return SYNTAX;
  const want = spec.value;
  if (input.length !== want.length) return WRONG;
  let wrong = false;
  for (let i = 0; i < want.length; i++) {
    if (input[i].length !== want[i].length) return WRONG;
    for (let j = 0; j < want[i].length; j++) {
      const got = parseNumber(input[i][j]);
      if (got.err) return fail(got.err);
      const exp = parseNumber(String(want[i][j]));
      if (!same(got.v, exp.v, spec.tol)) wrong = true;
    }
  }
  return wrong ? WRONG : OK;
}

function checkList(spec, input) {
  if (!Array.isArray(input)) return SYNTAX;
  const got = [];
  for (const item of input) {
    const r = parseNumber(item);
    if (r.err) return fail(r.err);
    got.push(r.v);
  }
  const want = [...spec.value].sort((a, b) => a - b);
  if (got.length !== want.length) return WRONG;
  got.sort((a, b) => a - b);
  return got.every((v, i) => same(v, want[i], spec.tol)) ? OK : WRONG;
}

// Výrazy se porovnávají číselně na pevné síti bodů (žádná náhoda: stejný vstup dá vždy stejný verdikt).
// Porovnává se tam, kde je definovaný vzorový výraz.
const GRID = Array.from({ length: 80 }, (_, k) => -10 + k * 0.37 + 0.11);
const MIN_COMPARE = 3;

function compile(node, name) {
  const code = node.compile();
  return (x) => {
    try {
      const r = code.evaluate({ [name]: x });
      return typeof r === 'number' && Number.isFinite(r) ? r : null;
    } catch { return null; }
  };
}

function checkExpression(spec, input) {
  const s = normalize(input);
  if (s === null) return SYNTAX;
  const name = spec.variable || 'x';
  let user; let expected;
  try {
    user = parse(s);
    if (usesBlocked(user)) return SYNTAX;
    expected = parse(normalize(String(spec.value)));
  } catch { return SYNTAX; }
  const evU = compile(user, name);
  const evE = compile(expected, name);
  let compared = 0;
  for (const x of GRID) {
    const e = evE(x);
    if (e === null) continue;
    const u = evU(x);
    if (u === null || !close(u, e)) return WRONG;
    compared++;
  }
  if (compared < MIN_COMPARE) return user.toString() === expected.toString() ? OK : WRONG;
  return OK;
}

export function check(answerSpec, input) {
  try {
    switch (answerSpec && answerSpec.kind) {
      case 'number': return checkNumber(answerSpec, input);
      case 'expression': return checkExpression(answerSpec, input);
      case 'choice': return checkChoice(answerSpec, input);
      case 'multichoice': return checkMultichoice(answerSpec, input);
      case 'truefalse': return checkTrueFalse(answerSpec, input);
      case 'table': return checkTable(answerSpec, input);
      case 'list': return checkList(answerSpec, input);
      default: return UNSUPPORTED;
    }
  } catch {
    return SYNTAX;
  }
}

export { TOL };
