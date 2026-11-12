# Propojení s Supabase – návod krok za krokem (Windows)

Supabase je bezplatná online databáze. Slouží k přihlášení a ukládání pokroku. Celé nastavení zabere asi 15 minut.

> **Dvě pravidla na začátek**
> 1. Klíč **service_role** a **heslo k databázi** NIKDY nikomu neposílej, nevkládej do souborů ani do chatu.
> 2. Do aplikace patří jen **Project URL** a klíč **anon public**. Ten je veřejný z principu, bezpečnost zajišťují pravidla v databázi.

## 1. Založení projektu
> Založ **nový** projekt jen pro Mikroekonomii. Nepoužívej projekt, který máš pro jinou aplikaci (např. Matiku), aby se nemíchaly účty ani data.

1. Otevři v prohlížeči <https://supabase.com> a klikni na **Start your project**.
2. Přihlaš se přes GitHub nebo e-mail (**Sign in**).
3. Klikni na **New project**. Pokud po tobě chce založit organizaci, potvrď výchozí hodnoty (**Free** plán).
4. Vyplň **Name** (např. `mikroekonomie-1`) a **Database Password** – klikni na **Generate a password** a heslo si ulož do správce hesel. Nikam ho nevkládej.
5. Zvol **Region** nejblíž (např. *Central EU (Frankfurt)*) a klikni na **Create new project**. Počkej, až se projekt vytvoří (pár minut).

## 2. Vytvoření tabulek
1. V levém sloupci klikni na **SQL Editor**, pak na **New query**.
2. Na počítači otevři soubor `supabase\schema.sql` v Poznámkovém bloku, stiskni **Ctrl+A**, **Ctrl+C**.
3. Vlož do okna editoru (**Ctrl+V**) a klikni na zelené tlačítko **Run**.
4. Dole má být zpráva **Success. No rows returned**.

## 3. Povolení e-mailů
Zaregistrovat se smějí jen e-maily, které přidáš sám.
1. **SQL Editor** → **New query**.
2. Vlož a uprav (svůj e-mail piš malými písmeny):
   ```sql
   insert into public.allowed_emails (email) values ('jmeno@example.com') on conflict do nothing;
   ```
3. Klikni na **Run**. Další e-maily přidáš stejně, jeden řádek `values` na každý.

## 4. Zkopírování adresy a klíče do aplikace
1. V levém sloupci klikni na ozubené kolo **Project Settings**, pak na **API** (u novějších verzí **Data API** / **API Keys**).
2. Zkopíruj **Project URL** (začíná `https://` a končí `.supabase.co`).
3. Zkopíruj klíč označený **anon** / **public** (dlouhý řetězec). **Nekopíruj** `service_role`!
4. Na počítači otevři soubor `js\config.js` a vlož hodnoty mezi uvozovky:
   ```js
   export const SUPABASE_URL = 'https://tvuj-projekt.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...tvuj-anon-klic...';
   ```
5. Ulož soubor (**Ctrl+S**).

## 5. Kontrola e-mailů a odkazů
1. **Authentication** → **Providers** → **Email**: nech zapnuté **Confirm email** (výchozí). Po registraci tak přijde potvrzovací e-mail.
2. Pro provoz na webu (GitHub Pages) později: **Authentication** → **URL Configuration**:
   - **Site URL**: adresa stránky, např. `https://tvojejmeno.github.io/mikroekonomie/`
   - **Redirect URLs** → **Add URL**: stejná adresa (a pro zkoušení na počítači `http://localhost:8521/`).
   - Klikni na **Save changes**.
   Odkazy v potvrzovacích e-mailech a e-mailech pro zapomenuté heslo pak povedou na správnou stránku.

## 6. Test
1. Spusť aplikaci (`npx --yes http-server -p 8521 -c-1` v PowerShellu ve složce projektu) a otevři `http://localhost:8521`.
2. Klikni na **Nemám účet, zaregistrovat se**, zadej povolený e-mail a heslo.
3. Zkontroluj schránku a klikni na odkaz v e-mailu. Pak se přihlas.
4. Zkus nepovolený e-mail: má se ukázat hláška „Tento e-mail není na seznamu povolených“.

## 7. Test zabezpečení (volitelné)
V **SQL Editoru** vlož obsah `supabase\rls_test.sql` a klikni na **Run**. V záložce **Messages** má být na konci `VSE PRESLO`. Test nic trvale nezapíše.

## 8. Dobré vědět: uspání bezplatného projektu
Bezplatný projekt Supabase se po delší nečinnosti (asi týden bez používání) sám **pozastaví**. Přihlášení pak nefunguje. Otevři <https://supabase.com/dashboard>, klikni na projekt a na **Restore project**. Obnovení trvá pár minut a data zůstanou zachována.
