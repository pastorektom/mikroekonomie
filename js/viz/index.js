// Dispečer grafických pomůcek kroku: step.viz = { kind, data } -> js/viz/<kind>.js draw(svg, data).
// Pomůcka se kreslí do stejného tmavého rámu jako tabule (třída .board), takže řešení působí jednotně.

const MODULES = {};
// Další druhy grafiky (např. ekonomické křivky) se zaregistrují zde: registerViz('econ', modul).
export function registerViz(kind, mod) { MODULES[kind] = mod; VIZ_KINDS.add(kind); }
export const VIZ_KINDS = new Set();

export function disposeViz(target) {
  if (!target?.querySelectorAll) return;
  for (const e of target.querySelectorAll('.viz-board, .viz-scroll')) e.remove();
}

// Vrací true, když se něco nakreslilo; jinak nechá cíl beze změny (krokovač ukáže step.tex).
// Volba join: pomůcka se přidá do již nakresleného rámu tabule (pod řádky postupu).
export function drawViz(target, viz, { join = false } = {}) {
  disposeViz(target);
  if (!target || !viz || typeof viz !== 'object' || !Object.hasOwn(MODULES, viz.kind)) return false;
  const doc = target.ownerDocument;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  let ok = false;
  try { ok = MODULES[viz.kind].draw(svg, viz.data) === true; } catch { ok = false; }
  if (!ok) return false;
  const scroll = doc.createElement('div');
  scroll.className = 'viz-scroll';
  scroll.appendChild(svg);
  const host = join ? target.querySelector(':scope > .board') : null;
  if (host) { scroll.classList.add('viz-joined'); host.appendChild(scroll); return true; }
  const frame = doc.createElement('div');
  frame.className = 'board viz-board';
  frame.appendChild(scroll);
  target.appendChild(frame);
  return true;
}
