// Krokovač řešeného postupu: vpřed/vzad, „Krok N z M“, u každého kroku popis + grafika.
// Grafiku kroku může dodat volající: opts.renderStepVisual(target, step, index, steps)
// vrátí true, pokud krok vykreslil (např. tabule z js/viz/board.js pro step.board
// nebo SVG z js/viz/* pro step.viz). Jinak se zobrazí step.tex, je-li zadán.
// opts.disposeStepVisual(target) se zavolá při destroy() (uvolnění pozorovatelů apod.).
import { renderTex, renderText, h } from '../render.js';

export function clampStep(i, n) {
  if (!(n > 0)) return 0;
  return Math.min(Math.max(Math.trunc(Number(i) || 0), 0), n - 1);
}

export function stepCounterText(i, n) {
  return `Krok ${i + 1} z ${n}`;
}

export function mountStepper(el, steps, opts = {}) {
  const doc = el.ownerDocument;
  const list = Array.isArray(steps) ? steps : [];
  el.textContent = '';

  if (list.length === 0) {
    el.appendChild(h(doc, 'p', { class: 'empty', text: 'Postup k tomuto příkladu zatím není k dispozici.' }));
    return { get index() { return 0; }, go() {}, next() {}, prev() {}, destroy() {} };
  }

  const counter = h(doc, 'p', { class: 'stepper-counter', 'data-role': 'counter', 'aria-live': 'polite' });
  const progress = h(doc, 'ol', { class: 'stepper-progress', 'aria-hidden': 'true' },
    list.map(() => h(doc, 'li')));
  const title = h(doc, 'h3', { class: 'stepper-title', 'data-role': 'title' });
  // „Krok N z M.“ v popisku pod tabulí (viditelný jen u kroků s tabulí, viz css/board.css);
  // čtečkám stačí živé počítadlo v hlavičce.
  const captionCount = h(doc, 'span', { class: 'stepper-caption-count', 'aria-hidden': 'true' });
  const text = h(doc, 'div', { class: 'stepper-text prose', 'data-role': 'text' });
  const visual = h(doc, 'div', { class: 'stepper-visual', 'data-role': 'visual' });
  const prev = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'prev' }, 'Předchozí');
  const next = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-role': 'next' }, 'Další krok');
  const root = h(doc, 'section', { class: 'stepper', 'aria-label': 'Postup krok za krokem' }, [
    h(doc, 'header', { class: 'stepper-head' }, [counter, progress]),
    visual,
    h(doc, 'div', { class: 'stepper-body' }, [captionCount, title, text]),
    h(doc, 'nav', { class: 'stepper-nav', 'aria-label': 'Krokování' }, [prev, next]),
  ]);
  el.appendChild(root);

  let index = -1;

  function show(i) {
    const target = clampStep(i, list.length);
    if (target === index) return;
    index = target;
    const step = list[index] || {};
    counter.textContent = stepCounterText(index, list.length);
    captionCount.textContent = `${stepCounterText(index, list.length)}.`;
    [...progress.children].forEach((li, k) => {
      li.className = k < index ? 'done' : k === index ? 'current' : '';
    });
    title.textContent = step.title || '';
    renderText(text, step.text || '');

    visual.textContent = '';
    let drawn = false;
    if (typeof opts.renderStepVisual === 'function') {
      try { drawn = !!opts.renderStepVisual(visual, step, index, list); } catch { drawn = false; }
    }
    if (!drawn && step.tex) {
      renderTex(visual, step.tex, { display: true });
      drawn = true;
    }
    visual.hidden = !drawn;

    const active = doc.activeElement;
    prev.disabled = index === 0;
    next.disabled = index === list.length - 1;
    if (active === prev && prev.disabled) next.focus();
    if (active === next && next.disabled) prev.focus();
    if (typeof opts.onChange === 'function') opts.onChange(index);
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  root.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
  });

  show(opts.start ?? 0);

  return {
    get index() { return index; },
    go: show,
    next: () => show(index + 1),
    prev: () => show(index - 1),
    destroy: () => {
      // Volající uvolní svou grafiku (např. disposeBoard z js/viz/board.js).
      if (typeof opts.disposeStepVisual === 'function') {
        try { opts.disposeStepVisual(visual); } catch { /* ignorováno */ }
      }
      el.textContent = '';
    },
  };
}
