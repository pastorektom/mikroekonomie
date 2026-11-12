// Ukládání pokroku do Supabase s offline frontou.
// Idempotence: řádek je určen dvojicí (seed, created_at) + user_id (unikátní omezení v schema.sql);
// zápis je upsert s ignorováním duplicit, takže opakované odeslání nic nezdvojí.
// Každý řádek ve frontě nese user_id; odesílá se jen pod stejným uživatelem a bez uživatele se nic neukládá.
let client = null;
let storage = null;
let userId = null;
let queue = [];
let flushing = null;
const KEY = 'mikroekonomie.fronta';
const MIN_TRIES = 3;

function safeLocal() { try { return localStorage; } catch { return null; } }

function load() {
  try {
    const raw = storage?.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((r) => r && r.user_id) : [];
  } catch { return []; }
}
function save() {
  try { storage?.setItem(KEY, JSON.stringify(queue)); } catch { /* úložiště nemusí být k dispozici */ }
}

export function initProgress(c, s) {
  client = c || null;
  storage = s ?? safeLocal();
  userId = null;
  flushing = null;
  queue = client ? load() : [];
}

// Volá se po přihlášení (id uživatele) a pro hosta (null).
export function setProgressUser(id) { userId = id || null; }

export function pendingCount() { return queue.length; }

// 'ok' = uloženo, 'retry' = zkusit později (síť, 5xx, vypršelá relace), 'drop' = trvalá chyba
function classify(res) {
  const err = res?.error;
  if (!err) return 'ok';
  const status = res.status ?? err.status;
  if (status === 401 || status >= 500) return 'retry';
  if (typeof status === 'number' && status >= 400) return 'drop';
  if (err.code && !/fetch|network/i.test(err.message ?? '')) return /^PGRST30[1-3]$/.test(err.code) ? 'retry' : 'drop';
  return 'retry';
}

async function send(row) {
  try {
    const res = await client.from('attempts').upsert(row, { onConflict: 'user_id,seed,created_at', ignoreDuplicates: true });
    const r = classify(res);
    if (r === 'drop') console.warn('Pokus se nepodařilo uložit a byl zahozen:', res.error?.message ?? res.error);
    return r;
  } catch { return 'retry'; }
}

// Odešle řádky aktuálního uživatele popořadě; při dočasné chybě skončí, cizí řádky nechá být.
export function flushQueue() {
  if (!client || !userId) return Promise.resolve();
  if (flushing) return flushing;
  const me = userId;
  flushing = (async () => {
    for (const row of [...queue]) {
      if (row.user_id !== me || userId !== me) continue;
      const r = await send(row);
      if (r === 'retry') break;
      queue = queue.filter((x) => x !== row);
      save();
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

export async function recordAttempt({ topic, type, seed, answer, correct, ms, created_at, selfGraded }) {
  if (!client || !userId) return { saved: false, queued: false };
  const row = {
    user_id: userId, topic, type, seed, answer: String(answer ?? ''), correct: !!correct,
    ms: Math.round(ms ?? 0), self_graded: !!selfGraded, created_at: created_at ?? new Date().toISOString(),
  };
  const r = await send(row);
  if (r === 'ok') {
    if (queue.some((x) => x.user_id === userId)) await flushQueue();
    return { saved: true, queued: false };
  }
  if (r === 'drop') return { saved: false, queued: false, dropped: true };
  queue.push(row);
  save();
  return { saved: false, queued: true };
}

// Souhrn počítá databáze (funkce topic_stats), takže ho neomezuje limit 1000 řádků.
export async function topicStats() {
  if (!client) return [];
  try {
    const { data, error } = await client.rpc('topic_stats');
    if (error || !Array.isArray(data)) return [];
    return data.map((r) => {
      const tried = Number(r.tried);
      return { topic: r.topic, tried, correctRate: tried > 0 ? Number(r.correct_count) / tried : 0 };
    });
  } catch { return []; }
}

// Téma s nejnižší úspěšností (aspoň MIN_TRIES pokusů); bez dostatku dat první téma v pořadí.
export function recommendNext(stats, order) {
  const ids = order ?? stats.map((s) => s.topic);
  const rank = (id) => { const i = ids.indexOf(id); return i < 0 ? Infinity : i; };
  const eligible = stats.filter((s) => s.tried >= MIN_TRIES);
  if (eligible.length === 0) return ids[0];
  eligible.sort((a, b) => a.correctRate - b.correctRate || rank(a.topic) - rank(b.topic));
  return eligible[0].topic;
}

// ---------- Zkouškový režim ----------
const EXAM_KINDS = ['zapocet', 'zkouska'];

// Zapíše výsledek zkoušky nanečisto (tabulka exam_runs). Do offline fronty se nezařazuje:
// při chybě vrátí { saved: false } a obrazovka výsledek ukáže i tak. Nesmyslné body se odmítnou.
export async function recordExam({ kind, points, maxPoints, selfGradedOk = 0, selfGradedTotal = 0, ms = 0 }) {
  if (!client || !userId) return { saved: false };
  const valid = EXAM_KINDS.includes(kind) && Number.isFinite(points) && Number.isFinite(maxPoints)
    && points >= 0 && maxPoints > 0 && points <= maxPoints;
  if (!valid) return { saved: false };
  const row = {
    user_id: userId, kind, points, max_points: maxPoints,
    self_graded_ok: selfGradedOk, self_graded_total: selfGradedTotal, ms: Math.round(ms),
    created_at: new Date().toISOString(),
  };
  try {
    const res = await client.from('exam_runs').insert(row);
    return { saved: !res?.error };
  } catch { return { saved: false }; }
}

// Posledních 20 zkoušek přihlášeného uživatele, nejnovější první (ochrana řádků ukáže jen jeho).
export async function listExams() {
  if (!client) return [];
  try {
    const { data, error } = await client.from('exam_runs').select('*').order('created_at', { ascending: false }).limit(20);
    return error || !Array.isArray(data) ? [] : data;
  } catch { return []; }
}
