// Přihlašovací obrazovka: přihlášení, registrace, zapomenuté heslo.
// Bez konfigurace Supabase nabídne jen pokračování bez přihlášení (pro vývoj).
import { h } from '../render.js';
import { signIn, signUp, resetPassword, changePassword, MIN_PASSWORD } from '../auth.js';

export function renderLogin(main, { configured, onLogin = () => {}, onGuest = () => {} } = {}) {
  const doc = main.ownerDocument;
  main.textContent = '';
  const card = h(doc, 'section', { class: 'auth-card', 'aria-labelledby': 'auth-title' });
  main.appendChild(card);
  card.appendChild(h(doc, 'h1', { class: 'page-title', id: 'auth-title', text: 'Mikroekonomie 1' }));

  // Host jen při nevyplněné konfiguraci (vývoj); při propojené databázi se přihlašuje vždy.
  const guestBtn = configured ? null : h(doc, 'button', {
    type: 'button', class: 'btn btn-quiet', text: 'Pokračovat bez přihlášení (pokrok se neuloží)', onclick: () => onGuest(),
  });

  if (!configured) {
    card.appendChild(h(doc, 'p', { class: 'notice', role: 'status', text: 'Aplikace zatím není propojená s databází. Přihlášení bude fungovat po vyplnění souboru js/config.js.' }));
    card.appendChild(h(doc, 'div', { class: 'actions' }, guestBtn));
    return;
  }

  let mode = 'in'; // 'in' | 'up' | 'reset'
  const msg = h(doc, 'p', { class: 'auth-msg', role: 'alert' });
  const email = h(doc, 'input', { id: 'auth-email', name: 'email', type: 'email', autocomplete: 'email', required: true, inputmode: 'email' });
  const password = h(doc, 'input', { id: 'auth-password', name: 'password', type: 'password', required: true, minlength: 6 });
  const passRow = h(doc, 'div', { class: 'field' }, [h(doc, 'label', { for: 'auth-password', text: 'Heslo' }), password]);
  const submit = h(doc, 'button', { type: 'submit', class: 'btn btn-primary' });
  const modes = h(doc, 'div', { class: 'auth-links' });
  const lede = h(doc, 'p', { class: 'lede' });

  function setMsg(text, ok) {
    msg.textContent = text || '';
    msg.dataset.kind = ok ? 'ok' : 'error';
  }

  function sync() {
    const titles = { in: 'Přihlásit se', up: 'Zaregistrovat se', reset: 'Poslat odkaz pro nové heslo' };
    submit.textContent = titles[mode];
    passRow.hidden = mode === 'reset';
    password.required = mode !== 'reset';
    password.autocomplete = mode === 'up' ? 'new-password' : 'current-password';
    lede.textContent = mode === 'reset' ? 'Napiš e-mail a pošleme ti odkaz pro nastavení nového hesla.'
      : mode === 'up' ? 'Registrovat se mohou jen e-maily schválené správcem.' : 'Přihlaš se, ať se ti ukládá pokrok.';
    modes.textContent = '';
    const link = (m, text) => modes.appendChild(h(doc, 'button', { type: 'button', class: 'link-btn', text, onclick: () => { mode = m; setMsg(''); sync(); } }));
    if (mode !== 'in') link('in', 'Mám účet, přihlásit se');
    if (mode !== 'up') link('up', 'Nemám účet, zaregistrovat se');
    if (mode !== 'reset') link('reset', 'Zapomenuté heslo');
  }

  const form = h(doc, 'form', { novalidate: true }, [
    h(doc, 'div', { class: 'field' }, [h(doc, 'label', { for: 'auth-email', text: 'E-mail' }), email]),
    passRow, msg, h(doc, 'div', { class: 'actions' }, submit),
  ]);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!email.value.trim() || (mode !== 'reset' && !password.value)) { setMsg('Vyplň e-mail i heslo.'); return; }
    submit.disabled = true;
    setMsg('Moment…', true);
    const r = mode === 'in' ? await signIn(email.value, password.value)
      : mode === 'up' ? await signUp(email.value, password.value)
        : await resetPassword(email.value);
    submit.disabled = false;
    if (!r.ok) { setMsg(r.error); return; }
    if (mode === 'in') { setMsg(''); onLogin(); return; }
    setMsg(r.message, true);
  });

  card.append(lede, form, modes);
  sync();
}

// Formulář „Nastav nové heslo“ po kliknutí na odkaz z e-mailu pro obnovu hesla.
export function renderNewPassword(main, { onDone = () => {} } = {}) {
  const doc = main.ownerDocument;
  main.textContent = '';
  const msg = h(doc, 'p', { class: 'auth-msg', role: 'alert' });
  const p1 = h(doc, 'input', { id: 'np-1', name: 'password', type: 'password', autocomplete: 'new-password', required: true, minlength: MIN_PASSWORD });
  const p2 = h(doc, 'input', { id: 'np-2', name: 'password2', type: 'password', autocomplete: 'new-password', required: true, minlength: MIN_PASSWORD });
  const submit = h(doc, 'button', { type: 'submit', class: 'btn btn-primary', text: 'Změnit heslo' });
  const form = h(doc, 'form', { novalidate: true }, [
    h(doc, 'div', { class: 'field' }, [h(doc, 'label', { for: 'np-1', text: `Nové heslo (aspoň ${MIN_PASSWORD} znaků)` }), p1]),
    h(doc, 'div', { class: 'field' }, [h(doc, 'label', { for: 'np-2', text: 'Nové heslo ještě jednou' }), p2]),
    msg, h(doc, 'div', { class: 'actions' }, submit),
  ]);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    submit.disabled = true;
    const r = await changePassword(p1.value, p2.value);
    submit.disabled = false;
    msg.dataset.kind = r.ok ? 'ok' : 'error';
    msg.textContent = r.ok ? r.message : r.error;
    if (r.ok) onDone();
  });
  main.appendChild(h(doc, 'section', { class: 'auth-card', 'aria-labelledby': 'np-title' }, [
    h(doc, 'h1', { class: 'page-title', id: 'np-title', text: 'Nastav nové heslo' }), form,
  ]));
}
