// Společné pomůcky kontroly odpovědí: omezený math.js, normalizace vstupu, čtení čísel.
import * as mathjs from 'mathjs';

export const TOL = 1e-9;
export const SYNTAX = { ok: false, reason: 'syntax' };
export const WRONG = { ok: false, reason: 'wrong' };
export const UNSUPPORTED = { ok: false, reason: 'unsupported' };

// Vlastní instance math.js, ve které jsou nebezpečné funkce zablokované.
// Uživatelský vstup se vyhodnocuje jen přes `parse`/`evaluate` získané PŘED zablokováním.
const m = mathjs.create(mathjs.all);
export const parse = m.parse;
export const evaluate = m.evaluate;
export const BLOCKED = ['createUnit', 'evaluate', 'parse', 'simplify', 'simplifyCore', 'simplifyConstant',
  'derivative', 'rationalize', 'resolve', 'compile', 'parser', 'help', 'reviver', 'chain', 'config', 'import'];
const blocker = () => { throw new Error('Zakázaná funkce'); };
m.import(Object.fromEntries(BLOCKED.map((n) => [n, blocker])), { override: true, silent: true });

// Sjednocení Unicode znaků a české desetinné čárky.
export function normalize(input, { decimalComma = true } = {}) {
  if (typeof input !== 'string') return null;
  let s = input.trim()
    .replace(/[−–—]/g, '-')
    .replace(/[·×⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/\bln\s*(?=\()/g, 'log') // přirozený logaritmus: math.js zná jen log
    .replace(/\bln\s*([A-Za-z0-9.]+)/g, 'log($1)')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/√\s*(?=\()/g, 'sqrt')
    .replace(/√\s*([A-Za-z0-9.]+)/g, 'sqrt($1)');
  if (decimalComma) s = s.replace(/(\d),(\d)/g, '$1.$2');
  return s === '' ? null : s;
}

export function close(a, b) {
  return Math.abs(a - b) <= TOL * Math.max(1, Math.abs(a), Math.abs(b));
}

// Vrací {v} nebo {err: 'syntax'|'wrong'}. Nekonečno a NaN je 'wrong' (vstup se naparsoval).
export function parseNumber(input, opts) {
  const s = normalize(input, opts);
  if (s === null) return { err: 'syntax' };
  let v;
  try { v = evaluate(s); } catch { return { err: 'syntax' }; }
  if (typeof v === 'number') return Number.isFinite(v) ? { v } : { err: 'wrong' };
  if (v && v.isComplex) return { err: 'wrong' };
  return { err: 'syntax' };
}

export const fail = (err) => (err === 'wrong' ? WRONG : SYNTAX);

// Uživatelský výraz volající zakázanou funkci je syntaktická chyba.
export function usesBlocked(node) {
  let bad = false;
  node.traverse((n) => { if (n.isSymbolNode && BLOCKED.includes(n.name)) bad = true; });
  return bad;
}
