// Obrazovka zkoušky nanečisto: úvod s pravidly, jedna úloha na stránce s odpočtem času, přehled s odhadem
// bodů a známky a zápis výsledku. Kreslené grafy se do bodů nepočítají, student si je ohodnotí sám.
// Závislosti (build, now, schedule, record, rng) lze podstrčit přes opts kvůli testům.
import { EXAMS, buildExam, scoreExam, remainingMs, formatClock } from '../exam.js';
import { recordExam } from '../progress.js';
import { renderTex, renderText, h } from '../render.js';
import { makeRng, randomSeed } from '../rng.js';
import { routeHref } from '../router.js';
import { createAnswerInput, symbolPanel, TEXT_KINDS } from './inputs.js';
import { mountWhiteboard } from './whiteboard.js';
import { formatAnswer } from './practice.js';
import { drawViz, disposeViz } from '../viz/index.js';

export function mountExam(el, kind, opts = {}) {
  const doc = el.ownerDocument;
  const cfg = EXAMS[kind];
  const now = opts.now || (() => Date.now());
  const record = opts.record || recordExam;
  const build = opts.build || buildExam;
  const rng = opts.rng || makeRng(randomSeed());
  const schedule = opts.schedule || ((fn, ms) => { const id = setInterval(fn, ms); return () => clearInterval(id); });

  let problems = [];
  let panels = [];
  let inputs = [];
  let boards = [];
  let stopTick = null;
  let index = 0;
  let startedAt = 0;
  let finishedAt = 0;
  let finished = false;
  let saved = false;
  let result = null;
  let selfMarks = [];
  let clockEl = null;
  let positionEl = null;
  let dots = [];

  el.textContent = '';

  function stop() {
    if (stopTick) { stopTick(); stopTick = null; }
  }

  // ---------- úvod ----------
  problems = build(kind, opts.topics || [], rng);
  const intro = h(doc, 'section', { class: 'exam-intro' }, [
    h(doc, 'p', { class: 'lede', text: kind === 'zapocet'
      ? `Zápočtový test nanečisto: ${cfg.max} bodů, na zápočet je potřeba ${cfg.min} bodů, čas ${cfg.minutes} minut. Úlohy odpovídají příkladům ze cvičení.`
      : `Zkouška nanečisto: ${cfg.max} bodů, minimum ${cfg.min} bodů, čas ${cfg.minutes} minut. Otázky jsou na grafy, vztahy a definice ze všech témat.` }),
    h(doc, 'ul', { class: 'exam-rules' }, [
      h(doc, 'li', { text: 'Po spuštění běží odpočet. Když vyprší, test se odevzdá sám.' }),
      h(doc, 'li', { text: 'Mezi úlohami se můžeš vracet a odpovědi se zachovají.' }),
      h(doc, 'li', { text: 'Kreslené grafy aplikace neohodnotí. Po odevzdání si je porovnáš se vzorem a označíš sám. Do bodů se nepočítají.' }),
    ]),
  ]);
  el.appendChild(intro);
  if (problems.length === 0) {
    intro.appendChild(h(doc, 'p', { class: 'empty', text: 'Úlohy pro tuto část zatím nejsou hotové. Zkus to, až přibudou další témata.' }));
    return { destroy() {}, get finished() { return false; } };
  }
  intro.appendChild(h(doc, 'div', { class: 'actions' }, h(doc, 'button', {
    type: 'button', class: 'btn btn-primary', 'data-role': 'start', text: 'Začít test', onclick: start,
  })));

  // ---------- test ----------
  function buildPanel(p, i) {
    const panel = h(doc, 'section', { class: 'exam-q', 'data-q': String(i), hidden: i !== 0 });
    panel.appendChild(h(doc, 'p', { class: 'prompt-label', text: `${p.points} ${p.points === 1 ? 'bod' : p.points < 5 ? 'body' : 'bodů'}` }));
    if (p.task) panel.appendChild(renderText(h(doc, 'div', { class: 'prompt-task prose' }), p.task));
    if (p.promptTex) {
      const f = h(doc, 'div', { class: 'formula' });
      renderTex(f, p.promptTex, { display: true });
      panel.appendChild(f);
    }
    if (p.promptViz) {
      const pv = h(doc, 'div', { class: 'prompt-viz' });
      if (drawViz(pv, p.promptViz)) panel.appendChild(pv);
    }
    if (p.answerSpec.kind === 'whiteboard') {
      const box = h(doc, 'div', { class: 'practice-board' });
      panel.appendChild(box);
      boards[i] = mountWhiteboard(box);
      inputs[i] = null;
    } else {
      const ai = createAnswerInput(doc, p.answerSpec, {});
      inputs[i] = ai;
      const field = h(doc, 'div', { class: 'answer-field', 'data-role': 'answer' }, ai.el);
      if (TEXT_KINDS.has(p.answerSpec.kind)) {
        const sym = symbolPanel(doc, ai.inputs, {});
        panel.append(h(doc, 'div', { class: 'answer-row' }, [field, sym.toggle]), sym.panel);
      } else panel.appendChild(h(doc, 'div', { class: 'answer-row' }, field));
      ai.inputs.forEach((inp) => inp.addEventListener('input', markDots));
      ai.inputs.forEach((inp) => inp.addEventListener('change', markDots));
    }
    return panel;
  }

  function markDots() {
    dots.forEach((d, i) => d.classList.toggle('answered', !!inputs[i] && !inputs[i].isEmpty()));
  }

  function show(i) {
    index = Math.min(Math.max(i, 0), problems.length - 1);
    panels.forEach((p, k) => {
      p.hidden = k !== index;
      if (k === index) p.setAttribute('data-role', 'current'); else p.removeAttribute('data-role');
    });
    positionEl.textContent = `Úloha ${index + 1} z ${problems.length}`;
    dots.forEach((d, k) => d.setAttribute('aria-current', k === index ? 'true' : 'false'));
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === problems.length - 1;
  }

  let prevBtn; let nextBtn;
  function start() {
    startedAt = now();
    el.textContent = '';
    panels = problems.map(buildPanel);
    clockEl = h(doc, 'span', { class: 'exam-clock', 'data-role': 'clock', text: formatClock(remainingMs(startedAt, startedAt, cfg.minutes)) });
    positionEl = h(doc, 'span', { class: 'exam-position', 'data-role': 'position' });
    dots = problems.map((_, i) => h(doc, 'button', { type: 'button', class: 'exam-dot', 'aria-label': `Úloha ${i + 1}`, text: String(i + 1), onclick: () => show(i) }));
    prevBtn = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'prev', text: 'Předchozí', onclick: () => show(index - 1) });
    nextBtn = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-role': 'next', text: 'Další', onclick: () => show(index + 1) });
    el.append(
      h(doc, 'header', { class: 'exam-head' }, [positionEl, h(doc, 'span', { class: 'exam-time' }, ['Zbývá ', clockEl])]),
      h(doc, 'div', { class: 'exam-dots' }, dots),
      ...panels,
      h(doc, 'div', { class: 'exam-nav' }, [prevBtn, nextBtn]),
      h(doc, 'div', { class: 'actions' }, h(doc, 'button', { type: 'button', class: 'btn', 'data-role': 'finish', text: 'Odevzdat test', onclick: finish })),
    );
    show(0);
    stopTick = schedule(tick, 1000);
  }

  function tick() {
    if (finished) return;
    const left = remainingMs(startedAt, now(), cfg.minutes);
    clockEl.textContent = formatClock(left);
    if (left <= 0) finish();
  }

  // ---------- přehled ----------
  function finish() {
    if (finished) return;
    finished = true;
    finishedAt = now();
    stop();
    boards.forEach((b) => b?.destroy());
    const answers = problems.map((p, i) => (p.answerSpec.kind === 'whiteboard' ? {} : { value: inputs[i].getValue() }));
    result = scoreExam(kind, problems, answers);
    selfMarks = problems.map(() => null);
    renderReview();
  }

  function selfCounts() {
    const idx = problems.map((p, i) => (p.answerSpec.kind === 'whiteboard' ? i : -1)).filter((i) => i >= 0);
    return { total: idx.length, ok: idx.filter((i) => selfMarks[i] === true).length };
  }

  function estimateText() {
    if (result.estimate === null) return 'Odhad nelze spočítat: v testu nejsou úlohy, které umí aplikace zkontrolovat.';
    if (kind === 'zkouska') return `Odhad: ${result.estimate} z ${cfg.max} b, známka ${result.grade}.`;
    return `Odhad: ${result.estimate} z ${cfg.max} b, zápočet ${result.passed ? 'splněn' : 'nesplněn'}.`;
  }

  function renderReview() {
    el.textContent = '';
    const selfTotal = h(doc, 'p', { 'data-role': 'self-total' });
    const updateSelf = () => { const c = selfCounts(); selfTotal.textContent = `Kreslené grafy: ${c.ok} z ${c.total} zvládnuto (do bodů se nepočítají).`; };
    const review = h(doc, 'section', { class: 'exam-review', 'data-role': 'review' }, [
      h(doc, 'h2', { class: 'section-title', text: `Výsledek: ${result.points} z ${result.autoMax} b za úlohy, které aplikace zkontrolovala` }),
      h(doc, 'p', { class: 'exam-estimate', 'data-role': 'estimate', text: estimateText() }),
      h(doc, 'p', { class: 'exam-note', text: 'Odhad počítá jen z úloh, které umí aplikace zkontrolovat. Je to orientační číslo, ne skutečná známka.' }),
    ]);
    const selfIdx = problems.map((p, i) => (p.answerSpec.kind === 'whiteboard' ? i : -1)).filter((i) => i >= 0);
    if (selfIdx.length) {
      review.appendChild(h(doc, 'h3', { text: 'Kreslené grafy: porovnej se vzorem' }));
      for (const i of selfIdx) {
        const p = problems[i];
        const ref = h(doc, 'div', { class: 'reveal-viz' });
        drawViz(ref, p.answerSpec.reference);
        const ok = h(doc, 'button', { type: 'button', class: 'btn', 'data-role': 'self-ok', text: 'Zvládl jsem', onclick: () => { selfMarks[i] = true; updateSelf(); } });
        const bad = h(doc, 'button', { type: 'button', class: 'btn btn-quiet', 'data-role': 'self-bad', text: 'Nezvládl jsem', onclick: () => { selfMarks[i] = false; updateSelf(); } });
        review.appendChild(h(doc, 'div', { class: 'exam-self' }, [
          renderText(h(doc, 'div', { class: 'prompt-task prose' }), p.task || ''), ref, h(doc, 'div', { class: 'practice-buttons' }, [ok, bad]),
        ]));
      }
      review.appendChild(selfTotal);
      updateSelf();
    }
    const wrong = problems.map((p, i) => [p, i]).filter(([p, i]) => p.answerSpec.kind !== 'whiteboard' && !result.perProblem[i].ok);
    if (wrong.length) {
      const list = h(doc, 'ol', { class: 'exam-wrong', 'data-role': 'wrong' });
      for (const [p] of wrong) {
        const a = formatAnswer(p);
        const body = h(doc, 'div', { class: 'reveal-value' });
        if (a.tex != null) renderTex(body, a.tex, {}); else body.textContent = a.text;
        list.appendChild(h(doc, 'li', {}, [
          renderText(h(doc, 'div', { class: 'prose' }), p.task || ''),
          h(doc, 'p', { class: 'reveal-label', text: 'Správně:' }), body,
          h(doc, 'a', { href: routeHref(p.topic, 'postup', { seed: p.seed, type: p.type }), text: 'Ukaž postup' }),
        ]));
      }
      review.append(h(doc, 'h3', { text: 'Co ti nevyšlo' }), list);
    }
    const saveBtn = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-role': 'save', text: 'Uložit výsledek', onclick: save });
    review.appendChild(h(doc, 'div', { class: 'actions' }, saveBtn));
    el.appendChild(review);
  }

  function save() {
    if (saved) return;
    saved = true;
    const btn = el.querySelector('[data-role="save"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Ukládám…'; }
    const c = selfCounts();
    Promise.resolve(record({
      kind, points: result.estimate ?? 0, maxPoints: cfg.max, selfGradedOk: c.ok, selfGradedTotal: c.total, ms: finishedAt - startedAt,
    })).then((r) => { if (btn) btn.textContent = r && r.saved ? 'Uloženo' : 'Neuloženo (bez přihlášení nebo bez připojení)'; })
      .catch(() => { if (btn) btn.textContent = 'Neuloženo'; });
  }

  return {
    get finished() { return finished; },
    destroy() { stop(); boards.forEach((b) => b?.destroy()); panels.forEach((p) => disposeViz(p)); el.textContent = ''; },
  };
}
