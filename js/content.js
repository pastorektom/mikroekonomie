// Pevné příklady ze cvičení (přepsané z Moodlu). Nejsou v gitu: v ostré verzi leží v Supabase
// (tabulka problems, čitelná jen přihlášeným z allowed_emails), při vývoji bez konfigurace
// se čtou z content/problems/<téma>.json (složka je v .gitignore).
//
// Uložený tvar: { id, type, data?, promptTex, answerSpec, answerTex?, hint?, solution?, source }.
// Má-li příklad data a jeho typ v tématu funkci solve(data), postup (a chybějící pole)
// se sestaví stejným kódem jako u náhodných příkladů.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { topics } from './topics/index.js';

let client = null;
export function initContent(c) { client = c || null; }

export function hydrateProblems(topic, list) {
  const types = Array.isArray(topic?.types) ? topic.types : [];
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (!raw || typeof raw !== 'object') continue;
    const type = types.find((t) => t.id === raw.type);
    let built = {};
    if (raw.data && typeof type?.solve === 'function') {
      try { built = type.solve(raw.data); } catch (e) {
        console.warn(`Pevný příklad ${raw.id ?? '?'} (${raw.type}): postup se nepodařilo sestavit – ${e?.message ?? e}`);
        built = {};
      }
    }
    const p = { ...built, ...raw, topic: topic.id, solution: raw.solution ?? built.solution ?? [] };
    if (!p.promptTex || !p.answerSpec) continue;
    out.push(p);
  }
  return out;
}

const cache = new Map();

async function fetchRaw(topicId, fetchImpl) {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    if (!client) return [];
    const { data, error } = await client.from('problems').select('ord, payload').eq('topic', topicId).order('ord');
    if (error || !Array.isArray(data)) return [];
    return data.map((r) => r.payload);
  }
  // jen vývoj: soubor vedle aplikace; 404 = žádné pevné příklady
  const res = await fetchImpl(`content/problems/${encodeURIComponent(topicId)}.json`, { cache: 'no-cache' });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

// -> Promise<Problem[]> (v pořadí ze cvičení); při chybě nebo bez obsahu prázdné pole.
export async function loadFixedProblems(topicId, { fetchImpl = globalThis.fetch, topicList = topics } = {}) {
  if (cache.has(topicId)) return cache.get(topicId);
  const topic = topicList.find((t) => t.id === topicId);
  let list = [];
  try {
    if (topic && typeof fetchImpl === 'function') list = hydrateProblems(topic, await fetchRaw(topicId, fetchImpl));
  } catch { list = []; }
  if (list.length) cache.set(topicId, list);
  return list;
}

export function clearContentCache() { cache.clear(); }
