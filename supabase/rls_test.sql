-- Test řádkové ochrany. Spouští se ručně v Supabase: SQL Editor -> New query -> vložit celý soubor -> Run.
-- Nejdřív musí být spuštěné supabase/schema.sql.
--
-- Očekávaný výsledek: v záložce "Messages" (nebo Results) hlášky
--   NOTICE: OK: uzivatel A nevidi radky uzivatele B
--   NOTICE: OK: uzivatel A nevidi zkousky uzivatele B
--   NOTICE: OK: anon nevidi problems
--   NOTICE: OK: nepovoleny e-mail nelze zaregistrovat
--   NOTICE: OK: zmena e-mailu a normalizace
--   NOTICE: OK: povoleny uzivatel cte problems
--   NOTICE: VSE PRESLO
-- Při jakékoli chybě skript skončí s "EXCEPTION: FAIL: ..." a nic se nezapíše.
-- Na konci je ROLLBACK, takže po testu v databázi nezůstanou žádná testovací data.

begin;

insert into public.allowed_emails (email) values ('a@test.invalid'), ('b@test.invalid');
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000aa', 'a@test.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000bb', 'b@test.invalid', 'authenticated', 'authenticated');
insert into public.problems (topic, type, ord, payload) values ('test', 'test', 1, '{"x":1}');

-- Uživatel A zapíše pokus
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000aa","email":"a@test.invalid","role":"authenticated"}', true);
insert into public.attempts (topic, type, seed, correct) values ('test', 'test', 1, true);
reset role;

-- Uživatel B zapíše pokus a zkusí číst i podvrhnout cizí user_id
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000bb","email":"b@test.invalid","role":"authenticated"}', true);
insert into public.attempts (topic, type, seed, correct) values ('test', 'test', 2, false);
do $$
declare n int; blocked boolean := false; rc int;
begin
  update public.attempts set correct = false where user_id = '00000000-0000-0000-0000-0000000000aa';
  get diagnostics rc = row_count;
  if rc <> 0 then raise exception 'FAIL: B zmenil % radku uzivatele A', rc; end if;
  delete from public.attempts where user_id = '00000000-0000-0000-0000-0000000000aa';
  get diagnostics rc = row_count;
  if rc <> 0 then raise exception 'FAIL: B smazal % radku uzivatele A', rc; end if;
  if (select count(*) from public.topic_stats()) <> 1 or (select tried from public.topic_stats()) <> 1 then
    raise exception 'FAIL: topic_stats vraci cizi radky';
  end if;
  select count(*) into n from public.attempts;
  if n <> 1 then raise exception 'FAIL: B vidi % radku misto 1', n; end if;
  if exists (select 1 from public.attempts where user_id = '00000000-0000-0000-0000-0000000000aa') then
    raise exception 'FAIL: B vidi radky uzivatele A';
  end if;
  begin
    insert into public.attempts (user_id, topic, type, seed, correct)
      values ('00000000-0000-0000-0000-0000000000aa', 'test', 'test', 3, true);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: B zapsal radek pod identitou A'; end if;
  raise notice 'OK: uzivatel A nevidi radky uzivatele B (cteni, UPDATE i DELETE)';
end $$;
-- povolený uživatel čte problems
do $$
begin
  if (select count(*) from public.problems) <> 1 then raise exception 'FAIL: povoleny uzivatel nevidi problems'; end if;
  raise notice 'OK: povoleny uzivatel cte problems';
end $$;
reset role;

-- Nepřihlášený (anon) nevidí problems ani attempts
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.problems;
  exception when insufficient_privilege then n := 0;
  end;
  if n <> 0 then raise exception 'FAIL: anon vidi problems'; end if;
  begin
    select count(*) into n from public.attempts;
  exception when insufficient_privilege then n := 0;
  end;
  if n <> 0 then raise exception 'FAIL: anon vidi attempts'; end if;
  raise notice 'OK: anon nevidi problems';
end $$;
reset role;

-- Zkoušky nanečisto (exam_runs): A zapíše běh, B ho nevidí a nemůže zapsat pod identitou A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000aa","email":"a@test.invalid","role":"authenticated"}', true);
insert into public.exam_runs (kind, points, max_points) values ('zapocet', 31, 50);
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000bb","email":"b@test.invalid","role":"authenticated"}', true);
do $$
declare blocked boolean := false;
begin
  if (select count(*) from public.exam_runs) <> 0 then raise exception 'FAIL: B vidi zkousky uzivatele A'; end if;
  begin
    insert into public.exam_runs (user_id, kind, points, max_points)
      values ('00000000-0000-0000-0000-0000000000aa', 'zkouska', 12, 20);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: B zapsal zkousku pod identitou A'; end if;
  blocked := false;
  begin
    insert into public.exam_runs (kind, points, max_points) values ('zkouska', 25, 20);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: body nad maximum prosly'; end if;
  raise notice 'OK: uzivatel A nevidi zkousky uzivatele B';
end $$;
reset role;

-- Přihlášený, ale NE na seznamu: problems nevidí
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000cc","email":"cizi@test.invalid","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.problems) <> 0 then raise exception 'FAIL: nepovoleny uzivatel vidi problems'; end if;
end $$;
reset role;

-- Registrace nepovoleného e-mailu se odmítne triggerem
do $$
declare blocked boolean := false;
begin
  begin
    insert into auth.users (id, email, aud, role)
      values ('00000000-0000-0000-0000-0000000000dd', 'cizi@test.invalid', 'authenticated', 'authenticated');
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: nepovoleny e-mail se zaregistroval'; end if;
  raise notice 'OK: nepovoleny e-mail nelze zaregistrovat';
  -- zmena e-mailu existujiciho uzivatele na nepovoleny se odmitne
  blocked := false;
  begin
    update auth.users set email = 'jiny@test.invalid' where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: zmena e-mailu na nepovoleny prosla'; end if;
  -- normalizace allowed_emails
  insert into public.allowed_emails (email) values ('  Velke@Test.Invalid ');
  if not exists (select 1 from public.allowed_emails where email = 'velke@test.invalid') then
    raise exception 'FAIL: e-mail se nenormalizoval';
  end if;
  raise notice 'OK: zmena e-mailu a normalizace';
  raise notice 'VSE PRESLO';
end $$;

rollback;
