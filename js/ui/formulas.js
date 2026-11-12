// Obrazovka „Přehled vzorců“: vlastní, neoficiální přehled po tématech.
import { FORMULAS, DISCLAIMER } from '../formulas.js';
import { topics } from '../topics/index.js';
import { renderTex, renderText, h } from '../render.js';
import { routeHref } from '../router.js';

export function renderFormulas(el) {
  const doc = el.ownerDocument;
  el.textContent = '';
  el.appendChild(h(doc, 'p', { class: 'notice', text: DISCLAIMER }));
  for (const g of FORMULAS) {
    const topic = topics.find((t) => t.id === g.topic);
    const section = h(doc, 'section', { class: 'formula-group', 'aria-label': topic?.title || g.topic });
    section.appendChild(h(doc, 'h2', { class: 'section-title' }, topic
      ? h(doc, 'a', { href: routeHref(topic.id), text: `${topic.order} ${topic.title}` })
      : g.topic));
    for (const it of g.items) {
      const f = h(doc, 'div', { class: 'formula' });
      renderTex(f, it.tex, { display: true });
      const note = it.note ? renderText(h(doc, 'div', { class: 'formula-note prose' }), it.note) : null;
      section.appendChild(h(doc, 'div', { class: 'formula-item' }, [h(doc, 'h3', { class: 'formula-name', text: it.name }), f, note]));
    }
    el.appendChild(section);
  }
  return el;
}
