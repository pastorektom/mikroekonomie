#!/usr/bin/env node
// Zkontroluje content/problems/<téma>.json: každý příklad musí jít sestavit (type.solve(data)), mít zadání,
// správnou odpověď, která projde kontrolou, a postup. Vypíše počty podle témat a kapitol cvičebnice.
// Použití (z kořene projektu): node tools/validate-content.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { topics } from '../js/topics/index.js';
import { hydrateProblems } from '../js/content.js';
import { check } from '../js/checker.js';
import { correctInput } from '../tests/helpers/verify.js';

const dir = fileURLToPath(new URL('../content/problems/', import.meta.url));
const only = process.argv.slice(2); // volitelně ID témat, např. node tools/validate-content.mjs trh spotrebitel
let bad = 0;
let total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && (only.length === 0 || only.includes(x.replace(/\.json$/, '')))).sort()) {
  const topic = topics.find((t) => t.id === f.replace(/\.json$/, ''));
  if (!topic) { console.log(`${f}: neznámé téma`); bad++; continue; }
  const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const ids = new Set();
  const problems = hydrateProblems(topic, raw);
  if (problems.length !== raw.length) { console.log(`${f}: ${raw.length - problems.length} příkladů se nepodařilo sestavit`); bad++; }
  const byChapter = {};
  for (const p of problems) {
    const where = `${f} ${p.id}`;
    if (!p.id || ids.has(p.id)) { console.log(`${where}: chybí nebo se opakuje id`); bad++; }
    ids.add(p.id);
    if (!(typeof p.source === 'string' && p.source) && !(p.source && p.source.chapter != null && p.source.number != null)) { console.log(`${where}: chybí source ({ chapter, number } nebo text)`); bad++; }
    if (!Array.isArray(p.solution) || p.solution.length < 3) { console.log(`${where}: postup má méně než 3 kroky`); bad++; }
    if (p.answerSpec.kind !== 'whiteboard') {
      const r = check(p.answerSpec, correctInput(p.answerSpec));
      if (!r.ok) { console.log(`${where}: správná odpověď neprošla kontrolou`); bad++; }
    }
    byChapter[typeof p.source === 'string' ? p.source : p.source?.chapter] = (byChapter[p.source?.chapter] || 0) + 1;
  }
  total += problems.length;
  console.log(`${topic.order} ${topic.title}: ${problems.length} příkladů (kapitoly: ${Object.entries(byChapter).map(([c, n]) => `${c}: ${n}`).join(', ')})`);
}
console.log(`Celkem ${total} příkladů, chyb ${bad}.`);
process.exit(bad ? 1 : 0);
