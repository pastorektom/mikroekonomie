#!/usr/bin/env node
// Z content/problems/*.json vypíše SQL, které vloží pevné příklady do tabulky public.problems
// (topic, type, ord, payload). Výstup zkopírujte do Supabase: SQL Editor -> New query -> Run.
// Opakované spuštění nic nezdvojí: staré příklady se nejdřív smažou a vloží se znovu (vše v jedné transakci).
//
// Použití (z kořene projektu):  node tools/problems-to-sql.mjs > problems.sql
//   nebo po částech:             node tools/problems-to-sql.mjs --parts   (soubory content/sql/problems-01.sql …)
//   - topic = název souboru bez .json, ord = pořadí v souboru (od 1),
//   - type  = pole "type" příkladu, payload = celý příklad jako JSON.
// Soubor problems.sql do gitu NEPATŘÍ (obsahuje přepsané příklady z Moodlu).
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../content/problems/', import.meta.url));

// Řetězec pro SQL: apostrofy zdvojit (dollar-quoting by rozbil obsah s $).
export const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function toSql(files) {
  const lines = ['-- Pevné příklady ze cvičení. Vygenerováno: node tools/problems-to-sql.mjs', 'begin;'];
  // Pořadí (ord) se mění, když přibudou úlohy uprostřed seznamu, proto se staré příklady nejdřív smažou a vloží se znovu.
  // Tabulka problems obsahuje jen tyto příklady, nic jiného se tím nemaže.
  if (files.some((f) => f.problems.length > 0)) lines.push('delete from public.problems;');
  for (const { topic, problems } of files) {
    problems.forEach((p, i) => {
      const type = typeof p.type === 'string' && p.type ? p.type : 'cviceni';
      lines.push(`insert into public.problems (topic, type, ord, payload) values (${sqlString(topic)}, ${sqlString(type)}, ${i + 1}, ${sqlString(JSON.stringify(p))}::jsonb) on conflict do nothing;`);
    });
  }
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}

// Rozdělí SQL na části do maxBytes (jeden velký soubor se špatně vkládá do prohlížeče). První část smaže staré
// příklady, ostatní jen vkládají; pořadí (ord) se počítá v rámci celého tématu, ne části.
export function toSqlParts(files, maxBytes = 90000) {
  const statements = [];
  for (const { topic, problems } of files) {
    problems.forEach((p, i) => {
      const type = typeof p.type === 'string' && p.type ? p.type : 'cviceni';
      statements.push(`insert into public.problems (topic, type, ord, payload) values (${sqlString(topic)}, ${sqlString(type)}, ${i + 1}, ${sqlString(JSON.stringify(p))}::jsonb) on conflict do nothing;`);
    });
  }
  if (statements.length === 0) return [];
  const groups = [[]];
  let size = 0;
  for (const st of statements) {
    if (size + st.length > maxBytes && groups[groups.length - 1].length > 0) { groups.push([]); size = 0; }
    groups[groups.length - 1].push(st);
    size += st.length + 1;
  }
  return groups.map((g, i) => {
    const head = [`-- Pevné příklady ze cvičení, část ${i + 1} z ${groups.length}. Spouštějte po řadě od první.`, 'begin;'];
    if (i === 0) head.push('delete from public.problems;');
    return `${[...head, ...g, 'commit;'].join(String.fromCharCode(10))}${String.fromCharCode(10)}`;
  });
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
  if (process.argv.includes('--parts')) {
    const outDir = fileURLToPath(new URL('../content/sql/', import.meta.url));
    mkdirSync(outDir, { recursive: true });
    const parts = toSqlParts(files);
    parts.forEach((sql, i) => writeFileSync(join(outDir, `problems-${String(i + 1).padStart(2, '0')}.sql`), sql));
    process.stdout.write(`Zapsáno ${parts.length} souborů do content/sql/
`);
    return;
  }
  process.stdout.write(toSql(files));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
