// Přihlášení přes Supabase. Klient se předává zvenku (initAuth), takže testy nepotřebují síť.
let client = null;

export function initAuth(c) { client = c || null; }
export function isAuthReady() { return client !== null; }

const MESSAGES = [
  [/není na seznamu povolených|Database error saving new user/i, 'Tento e-mail není na seznamu povolených. Požádej správce o přidání.'],
  [/Invalid login credentials/i, 'E-mail nebo heslo nesedí. Zkus to znovu.'],
  [/Email not confirmed/i, 'E-mail ještě není potvrzený. Zkontroluj schránku a klikni na odkaz v e-mailu.'],
  [/already registered|already been registered/i, 'Tento e-mail už je zaregistrovaný. Zkus se přihlásit.'],
  [/Password should be at least/i, 'Heslo je příliš krátké, použij aspoň 6 znaků.'],
  [/rate limit|too many/i, 'Příliš mnoho pokusů. Chvíli počkej a zkus to znovu.'],
  [/Failed to fetch|NetworkError|network/i, 'Nepodařilo se spojit se serverem. Zkontroluj připojení k internetu.'],
];

export function friendlyAuthError(message) {
  const text = String(message ?? '');
  for (const [re, cs] of MESSAGES) if (re.test(text)) return cs;
  return 'Něco se nepovedlo. Zkus to prosím znovu.';
}

const NOT_READY = { ok: false, error: 'Aplikace zatím není propojená s databází.' };

async function run(fn) {
  if (!client) return NOT_READY;
  try {
    const { data, error } = await fn(client.auth);
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e?.message) };
  }
}

export async function signUp(email, password) {
  const r = await run((a) => a.signUp({ email: String(email).trim(), password }));
  return r.ok ? { ok: true, message: 'Zkontroluj e-mail a potvrď registraci.' } : r;
}

export function signIn(email, password) {
  return run((a) => a.signInWithPassword({ email: String(email).trim(), password }));
}

export async function signOut() {
  return run((a) => a.signOut().then((r) => ({ data: null, error: r?.error })));
}

export async function currentUser() {
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  } catch { return null; }
}

export async function resetPassword(email) {
  const redirectTo = typeof location !== 'undefined' ? location.origin + location.pathname : undefined;
  const r = await run((a) => a.resetPasswordForEmail(String(email).trim(), { redirectTo }));
  return r.ok ? { ok: true, message: 'Pokud je e-mail zaregistrovaný, přišel na něj odkaz pro nové heslo.' } : r;
}

// Událost přihlášení/obnovy hesla (např. 'PASSWORD_RECOVERY' po kliknutí na odkaz z e-mailu).
export function onAuthEvent(cb) {
  if (!client?.auth?.onAuthStateChange) return () => {};
  const { data } = client.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data?.subscription?.unsubscribe?.();
}

export const MIN_PASSWORD = 8;

// Nové heslo po obnově: kontrola délky a shody, pak updateUser.
export async function changePassword(p1, p2) {
  if (String(p1 ?? '').length < MIN_PASSWORD) return { ok: false, error: `Heslo musí mít aspoň ${MIN_PASSWORD} znaků.` };
  if (p1 !== p2) return { ok: false, error: 'Hesla se neshodují.' };
  const r = await run((a) => a.updateUser({ password: p1 }));
  return r.ok ? { ok: true, message: 'Heslo bylo změněno.' } : r;
}
