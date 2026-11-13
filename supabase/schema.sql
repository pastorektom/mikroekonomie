-- Schéma databáze pro Mikroekonomie 1. Spusťte celý soubor v Supabase: SQL Editor -> New query -> Run.
-- Skript je opakovatelný (lze spustit znovu bez chyby).

-- 1) Povolené e-maily. Čtení z prohlížeče je zakázané (řádková ochrana bez politik),
--    e-maily přidává jen správce v SQL Editoru.
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email))
);
alter table public.allowed_emails enable row level security;

-- E-mail se při vložení sám převede na malá písmena bez mezer (trigger běží před kontrolou omezení).
create or replace function public.normalize_allowed_email() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;
drop trigger if exists normalize_allowed_email on public.allowed_emails;
create trigger normalize_allowed_email
  before insert or update of email on public.allowed_emails
  for each row execute function public.normalize_allowed_email();

-- Pomocná funkce: je přihlášený uživatel na seznamu? (security definer = smí číst allowed_emails)
create or replace function public.is_allowed_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

-- 2) Registraci nepovoleného e-mailu odmítne trigger nad auth.users.
--    Supabase klientovi obvykle ukáže jen "Database error saving new user";
--    aplikace to přeloží na českou hlášku.
create or replace function public.reject_unlisted_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Tento e-mail není na seznamu povolených.';
  end if;
  return new;
end;
$$;
drop trigger if exists reject_unlisted_email on auth.users;
create trigger reject_unlisted_email
  before insert or update of email on auth.users
  for each row execute function public.reject_unlisted_email();
revoke all on function public.reject_unlisted_email() from public, anon, authenticated;
revoke all on function public.normalize_allowed_email() from public, anon, authenticated;

-- 3) Pokusy o příklady. Každý uživatel vidí a zapisuje jen své řádky.
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null,
  type text not null,
  seed bigint not null,
  answer text not null default '',
  correct boolean not null,
  self_graded boolean not null default false, -- ručně kreslený graf, hodnotí student sám
  ms integer not null default 0,
  created_at timestamptz not null default now(),
  -- idempotence: opakované odeslání téhož pokusu (offline fronta) se nezdvojí
  constraint attempts_idempotent unique (user_id, seed, created_at)
);
create index if not exists attempts_user_topic on public.attempts (user_id, topic);
alter table public.attempts enable row level security;

drop policy if exists attempts_select_own on public.attempts;
create policy attempts_select_own on public.attempts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists attempts_insert_own on public.attempts;
create policy attempts_insert_own on public.attempts
  for insert to authenticated with check (user_id = auth.uid());

-- Souhrn podle témat počítá databáze (bez limitu 1000 řádků). Security invoker = platí řádková ochrana,
-- uživatel tedy vidí jen své pokusy.
create or replace function public.topic_stats()
returns table (topic text, tried bigint, correct_count bigint)
language sql stable security invoker set search_path = '' as $$
  select a.topic, count(*), count(*) filter (where a.correct)
  from public.attempts a
  group by a.topic;
$$;
revoke all on function public.topic_stats() from public, anon;
grant execute on function public.topic_stats() to authenticated;

-- Pokud tabulka attempts už existovala bez sloupce self_graded, doplní se zde.
alter table public.attempts add column if not exists self_graded boolean not null default false;

-- 3b) Výsledky zkoušek nanečisto (zápočtový test: max 50 b, zkouška: max 20 b). Každý vidí jen své.
create table if not exists public.exam_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('zapocet', 'zkouska')),
  points numeric not null check (points >= 0),
  max_points numeric not null check (max_points > 0 and points <= max_points),
  self_graded_ok integer not null default 0,
  self_graded_total integer not null default 0,
  ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists exam_runs_user on public.exam_runs (user_id, created_at desc);
alter table public.exam_runs enable row level security;
drop policy if exists exam_runs_select_own on public.exam_runs;
create policy exam_runs_select_own on public.exam_runs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists exam_runs_insert_own on public.exam_runs;
create policy exam_runs_insert_own on public.exam_runs
  for insert to authenticated with check (user_id = auth.uid());

-- 4) Obsah příkladů: čitelný jen přihlášeným uživatelům z allowed_emails.
create table if not exists public.problems (
  topic text not null,
  type text not null,
  ord integer not null,
  payload jsonb not null,
  primary key (topic, type, ord)
);
alter table public.problems enable row level security;
drop policy if exists problems_select_allowed on public.problems;
create policy problems_select_allowed on public.problems
  for select to authenticated using (public.is_allowed_user());

-- Přidání e-mailu (příklad, nahraďte vlastním a spusťte zvlášť):
--   insert into public.allowed_emails (email) values ('jmeno@example.com') on conflict do nothing;

-- 5) Oprávnění pro Data API. Nové tabulky se v Supabase nemusí zpřístupnit samy, proto je přidělujeme výslovně.
--    Co smí kdo číst a zapisovat, dál hlídá řádková ochrana (RLS) výše. Přihlášený uživatel smí jen své řádky,
--    problems čte jen povolený e-mail, allowed_emails se z prohlížeče nečte vůbec (bez oprávnění).
grant usage on schema public to anon, authenticated;
grant select, insert on public.attempts to authenticated;
grant select, insert on public.exam_runs to authenticated;
grant select on public.problems to authenticated;
