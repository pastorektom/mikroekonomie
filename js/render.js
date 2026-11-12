// Vykreslení vzorců (KaTeX) a bezpečné vkládání textu.
// Text se NIKDY nevkládá jako HTML: jen textové uzly a elementy vytvořené kódem.
// KaTeX se předává přes setTexEngine (v prohlížeči z app.js), takže modul
// funguje i v Node testech bez KaTeX – vzorec se pak zobrazí jako zdrojový text.

let engine = null;

export function setTexEngine(k) { engine = k || null; }

// trust: výchozí false. Jen tabule (js/viz/board.js) předává úzkou funkci boardTrust,
// která povolí výhradně \htmlClass{bt-…}; hodnota true se nikdy nepřijme.
export function renderTex(el, tex, { display = false, trust = false } = {}) {
  const src = String(tex ?? '');
  el.textContent = '';
  if (engine) {
    try {
      const t = typeof trust === 'function' ? trust : false;
      engine.render(src, el, { displayMode: display, throwOnError: false, trust: t, strict: 'ignore', output: 'htmlAndMathml' });
      return el;
    } catch { /* spadne-li KaTeX, ukáže se zdroj */ }
  }
  el.textContent = src;
  el.classList?.add('tex-fallback');
  return el;
}

// 'Je $x^2$ kladné?' -> [{text 'Je '}, {math 'x^2'}, {text ' kladné?'}]. '\$' je dolar v textu.
export function splitInlineMath(text) {
  const s = String(text ?? '');
  const parts = [];
  let buf = '';
  const pushText = () => { if (buf) { parts.push({ type: 'text', value: buf }); buf = ''; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '$') { buf += '$'; i++; continue; }
    if (c === '$') {
      const end = s.indexOf('$', i + 1);
      if (end === -1) { buf += s.slice(i); break; }
      pushText();
      parts.push({ type: 'math', value: s.slice(i + 1, end) });
      i = end;
      continue;
    }
    buf += c;
  }
  pushText();
  return parts;
}

// Odstavce se oddělují prázdným řádkem, jednoduchý konec řádku je <br>.
// Vložené vzorce $…$ se sázejí přes renderTex.
export function renderText(el, text) {
  const doc = el.ownerDocument;
  el.textContent = '';
  const paragraphs = String(text ?? '').split(/\n\s*\n/).filter((p) => p.trim() !== '');
  for (const para of paragraphs) {
    const p = doc.createElement('p');
    const parts = splitInlineMath(para);
    for (let k = 0; k < parts.length; k++) {
      const part = parts[k];
      if (part.type === 'math') {
        const span = doc.createElement('span');
        span.className = 'tex-inline';
        renderTex(span, part.value);
        // Interpunkce hned za vzorcem se nesmí odtrhnout na další řádek.
        const nextPart = parts[k + 1];
        const punct = nextPart?.type === 'text' ? /^[.,;:!?)]+/.exec(nextPart.value) : null;
        if (punct) {
          const glue = doc.createElement('span');
          glue.className = 'nowrap';
          glue.append(span, doc.createTextNode(punct[0]));
          p.appendChild(glue);
          nextPart.value = nextPart.value.slice(punct[0].length);
        } else {
          p.appendChild(span);
        }
      } else {
        part.value.split('\n').forEach((line, i) => {
          if (i > 0) p.appendChild(doc.createElement('br'));
          if (line) p.appendChild(doc.createTextNode(line));
        });
      }
    }
    el.appendChild(p);
  }
  return el;
}

// Malý pomocník pro tvorbu elementů bez innerHTML.
export function h(doc, tag, attrs = {}, children = []) {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
  }
  return e;
}
