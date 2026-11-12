#!/usr/bin/env node
// Z content/problems/*.json vypíše SQL, které vloží pevné příklady do tabulky public.problems
// (topic, type, ord, payload). Výstup zkopírujte do Supabase: SQL Editor -> New query -> Run.
// Opakované spuštění nic nezdvojí (on conflict do nothing).
//
// Použití (z kořene projektu):  node tools/problems-to-sql.mjs > problems.sql
//   - topic = název souboru bez .json, ord = pořadí v souboru (od 1),
//   - type  = pole "type" příkladu, payload = celý příklad jako JSON.
// Soubor problems.sql do gitu NEPATŘÍ (obsahuje přepsané příklady z Moodlu).
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../content/problems/', import.meta.url));

// Řetězec pro SQL: apostrofy zdvojit (dollar-quoting by rozbil obsah s $).
export const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function toSql(files) {
  const lines = ['-- Pevné příklady ze cvičení. Vygenerováno: node tools/problems-to-sql.mjs', 'begin;'];
  for (const { topic, problems } of files) {
    problems.forEach((p, i) => {
      const type = typeof p.type === 'string' && p.type ? p.type : 'cviceni';
      lines.push(`insert into public.problems (topic, type, ord, payload) values (${sqlString(topic)}, ${sqlString(type)}, ${i + 1}, ${sqlString(JSON.stringify(p))}::jsonb) on conflict do nothing;`);
    });
  }
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}

function main() {
  let names;
  try { names = readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch {
    process.stderr.write('Složka content/problems neexistuje.\n');
    process.exit(1);
  }
  const files = names.map((f) => {
    const problems = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (!Array.isArray(problems)) throw new Error(`${f}: čekám pole příkladů`);
    return { topic: f.replace(/\.json$/, ''), problems };
  });
  process.stdout.write(toSql(files));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
