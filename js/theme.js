// Vzhled aplikace: podle systému, světlý, tmavý a OLED (čistě černé pozadí, šetří baterii u OLED displejů).
// Volba se ukládá v prohlížeči (localStorage) a nastavuje atribut data-theme na <html>; u „podle systému“
// atribut chybí a rozhoduje nastavení zařízení (prefers-color-scheme v css/app.css).
export const THEMES = ['system', 'light', 'dark', 'oled'];
export const STORAGE_KEY = 'mikroekonomie.tema';
export const THEME_LABELS = {
  system: 'Podle systému', light: 'Světlý', dark: 'Tmavý', oled: 'OLED (černý)',
};

// Barva lišty prohlížeče na telefonu pro ručně zvolený režim.
const BAR_COLORS = { light: '#eef0f5', dark: '#0d0f15', oled: '#000000' };

export const normalizeTheme = (t) => (THEMES.includes(t) ? t : 'system');
export const nextTheme = (t) => THEMES[(THEMES.indexOf(normalizeTheme(t)) + 1) % THEMES.length];

export function applyTheme(doc, theme) {
  const t = normalizeTheme(theme);
  const root = doc.documentElement;
  if (!root) return;
  if (t === 'system') delete root.dataset.theme; else root.dataset.theme = t;
  for (const meta of doc.querySelectorAll('meta[name="theme-color"]')) {
    // původní hodnoty se zapamatují při prvním zásahu, aby šlo vrátit „podle systému“
    if (!meta.hasAttribute('data-orig-content')) {
      meta.setAttribute('data-orig-content', meta.getAttribute('content') ?? '');
      if (meta.hasAttribute('media')) meta.setAttribute('data-orig-media', meta.getAttribute('media'));
    }
    if (t === 'system') {
      meta.setAttribute('content', meta.getAttribute('data-orig-content'));
      if (meta.hasAttribute('data-orig-media')) meta.setAttribute('media', meta.getAttribute('data-orig-media'));
    } else {
      meta.setAttribute('content', BAR_COLORS[t]);
      meta.removeAttribute('media');
    }
  }
}

export function loadTheme(storage) {
  try { return normalizeTheme(storage?.getItem(STORAGE_KEY)); } catch { return 'system'; }
}

export function saveTheme(storage, theme) {
  try {
    const t = normalizeTheme(theme);
    if (t === 'system') storage?.removeItem(STORAGE_KEY); else storage?.setItem(STORAGE_KEY, t);
  } catch { /* úložiště nemusí být k dispozici (soukromé okno) */ }
}
