// Zkouškový režim: pravidla bodování, sestavení testu a vyhodnocení. Čisté funkce bez DOM.
//
// Zápočtový test: 50 b, na zápočet 30 b, 50 min (počítané příklady ze cvičení, part 'zapocet').
// Zkouška: 20 b, minimum 12 b, 50 min (grafy, vztahy, definice, part 'zkouska'): A 19–20, B 17–18, C 15–16, D 13–14, E 12.
// Ručně kreslené grafy se automaticky nehodnotí: student si je sám označí a do bodů a odhadu známky se
// nezapočítávají, vykazují se zvlášť.
import { check } from './checker.js';
import { makeRng } from './rng.js';

export const EXAMS = {
  zapocet: { max: 50, min: 30, minutes: 50, count: 10, title: 'Zápočtový test' },
  zkouska: { max: 20, min: 12, minutes: 50, count: 10, title: 'Zkouška' },
};

const GRADES = [[19, 'A'], [17, 'B'], [15, 'C'], [13, 'D'], [12, 'E']];

export function gradeExam(kind, points) {
  const cfg = EXAMS[kind];
  if (!cfg || !Number.isFinite(points) || points < 0 || points > cfg.max) return { passed: false, grade: kind === 'zkouska' ? 'FX' : null };
  const passed = points >= cfg.min;
  if (kind !== 'zkouska') return { passed, grade: null };
  const hit = GRADES.find(([min]) => points >= min);
  return { passed, grade: hit ? hit[1] : 'FX' };
}

// Druh (zápočet, zkouška) typu úlohy se pozná z ukázkového příkladu; typ ho nemění.
const partCache = new WeakMap();
function partOf(type) {
  if (!partCache.has(type)) {
    let part = 'zapocet';
    try { part = type.generate(makeRng(1)).part || 'zapocet'; } catch { /* typ se přeskočí níže */ part = null; }
    partCache.set(type, part);
  }
  return partCache.get(type);
}

const seedFrom = (rng) => Math.floor(rng() * 4294967296) >>> 0;

function shuffled(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sestaví test: úlohy z hotových témat se střídají po tématech, aby z každého něco bylo; body se rozdělí
// celočíselně tak, že jejich součet je přesně maximum testu. Stejný rng dá stejný test.
export function buildExam(kind, topics, rng) {
  const cfg = EXAMS[kind];
  if (!cfg) return [];
  const ready = [...topics]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t) => ({ topic: t, types: shuffled(rng, (t.types || []).filter((ty) => partOf(ty) === kind)), next: 0 }))
    .filter((t) => t.types.length > 0);
  if (ready.length === 0) return [];
  const count = Math.min(cfg.max, Math.max(cfg.count, ready.length));
  const problems = [];
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    const slot = ready[i % ready.length];
    let problem = null;
    for (let attempt = 0; attempt < 8 && !problem; attempt++) {
      const type = slot.types[(slot.next + attempt) % slot.types.length];
      const p = type.generate(makeRng(seedFrom(rng)));
      const key = `${p.type}|${p.task}|${p.promptTex}`;
      if (!seen.has(key) || attempt === 7) { problem = { ...p, topic: slot.topic.id, type: type.id }; seen.add(key); }
    }
    slot.next++;
    problems.push(problem);
  }
  const base = Math.floor(cfg.max / count);
  const extra = cfg.max - base * count;
  return problems.map((p, i) => ({ ...p, part: kind, points: base + (i < extra ? 1 : 0) }));
}

const hasValue = (v) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.some((x) => (Array.isArray(x) ? x.some((y) => String(y).trim() !== '') : String(x).trim() !== '')) : typeof v === 'boolean');

// Vyhodnocení: answers[i] = { value } (psané odpovědi) nebo { selfGraded: true, ok } (kreslené grafy).
export function scoreExam(kind, problems, answers) {
  const cfg = EXAMS[kind];
  let points = 0; let autoMax = 0; let selfOk = 0; let selfTotal = 0;
  const perProblem = problems.map((p, i) => {
    const a = answers?.[i];
    if (p.answerSpec?.kind === 'whiteboard') {
      selfTotal++;
      const ok = !!(a && a.selfGraded && a.ok);
      if (ok) selfOk++;
      return { ok, points: 0, self: true };
    }
    autoMax += p.points;
    const ok = !!(a && hasValue(a.value) && check(p.answerSpec, a.value).ok);
    if (ok) points += p.points;
    return { ok, points: ok ? p.points : 0, self: false };
  });
  const estimate = autoMax > 0 && cfg ? Math.round((points / autoMax) * cfg.max * 10) / 10 : null;
  const verdict = estimate === null ? null : gradeExam(kind, estimate);
  return {
    points, autoMax, estimate, grade: verdict?.grade ?? null, passed: verdict ? verdict.passed : null, selfOk, selfTotal, perProblem,
  };
}

export const remainingMs = (startedAt, now, minutes) => Math.max(0, minutes * 60000 - (now - startedAt));

export function formatClock(ms) {
  if (!(ms > 0)) return '0:00';
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
