// Obrazovka Výklad: topic.theory = [{ heading, tex?, text, viz?: { kind, data }, mistakes?: string[] }]
// viz je stejná grafická pomůcka jako u kroků postupu (plot, tangent, matrix, gauss, signchart);
// kreslí se pod text a vzorec do rámu tabule. Vadná data se tiše vynechají.
import { renderTex, renderText, h } from '../render.js';
import { drawViz, disposeViz } from '../viz/index.js';

export function disposeTheory(el) {
  disposeViz(el);
}

export function renderTheory(el, topic) {
  const doc = el.ownerDocument;
  disposeTheory(el);
  el.textContent = '';
  const items = Array.isArray(topic?.theory) ? topic.theory : [];
  if (items.length === 0) {
    el.appendChild(h(doc, 'p', { class: 'empty', text: 'Výklad k tomuto tématu se připravuje.' }));
    return el;
  }
  for (const item of items) {
    const text = h(doc, 'div', { class: 'prose' });
    renderText(text, item.text || '');
    let formula = null;
    if (item.tex) {
      formula = h(doc, 'div', { class: 'formula' });
      renderTex(formula, item.tex, { display: true });
    }
    let viz = null;
    if (item.viz) {
      viz = h(doc, 'div', { class: 'theory-viz' });
      if (!drawViz(viz, item.viz)) viz = null;
    }
    let mistakes = null;
    if (Array.isArray(item.mistakes) && item.mistakes.length) {
      mistakes = h(doc, 'aside', { class: 'mistakes', 'aria-label': 'Časté chyby' }, [
        h(doc, 'h3', { text: 'Časté chyby' }),
        h(doc, 'ul', {}, item.mistakes.map((m) => renderText(h(doc, 'li'), m))),
      ]);
    }
    el.appendChild(h(doc, 'section', { class: 'theory-block' }, [
      h(doc, 'h2', { text: item.heading || '' }),
      text,
      formula,
      viz,
      mistakes,
    ]));
  }
  return el;
}
