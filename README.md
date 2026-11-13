# Mikroekonomie 1 – učebnice

Webová aplikace pro přípravu na zápočtový test a zkoušku z Mikroekonomie 1 (FaME UTB): výklad, procvičování s kontrolou výsledků, ekonomické grafy, kreslicí tabule, postup krok za krokem, test nanečisto a přehled vzorců. Funguje na počítači, Androidu, iPhonu i tabletu. Vše je česky.

**Nasazený web:** <https://pastorektom.github.io/mikroekonomie/> (přihlášení jen pro e-maily z tabulky `allowed_emails` v Supabase). Aktualizace webu se dělá odesláním změn na GitHub (větev `main`), nasazení proběhne samo.

## Spuštění u sebe

1. Ve složce projektu dvakrát klikni na **Spustit_aplikaci.bat**.
2. Otevře se prohlížeč na `http://localhost:8521`. Okno příkazového řádku nezavírej, vypneš ho klávesami **Ctrl+C**.
3. Dokud není vyplněný `js\config.js`, klikni na **Pokračovat bez přihlášení**. Pokrok se pak neukládá.

Testy (v PowerShellu ve složce projektu): `npm test`

## Nasazení pro spolužáky (krok za krokem)

Tento postup je už provedený. Zůstává tu jako návod, kdyby se mělo nasadit znovu nebo jinde.

### Přidání dalšího kamaráda
V Supabase v **SQL Editor** spusť (e-mail malými písmeny): `insert into public.allowed_emails (email) values ('jmeno@example.com') on conflict do nothing;`

### 1. Databáze Supabase (přihlášení a pokrok)
Postupuj podle **docs\supabase-navod.md**. Založ **nový** projekt, spusť `supabase\schema.sql`, přidej e-maily spolužáků do seznamu povolených a opiš **Project URL** a klíč **anon public** do souboru `js\config.js`. Klíč `service_role` ani heslo k databázi nikam nevkládej.

### 2. Repozitář na GitHubu
1. Na <https://github.com> klikni na **New repository**. Název např. `mikroekonomie`, zvol **Public** (GitHub Pages z privátního repozitáře vyžadují placený plán) a **nezaškrtávej** žádné přidávání souborů.
2. V PowerShellu ve složce projektu:
   ```powershell
   git branch -M main
   git remote add origin https://github.com/TVOJE-JMENO/mikroekonomie.git
   git push -u origin main
   ```
3. Před odesláním ověř, že se nenahrávají zdrojové materiály:
   ```powershell
   git ls-files | findstr /i "Moodle content"
   ```
   Příkaz nesmí vypsat nic.

### 3. Zapnutí GitHub Pages
1. V repozitáři klikni na **Settings**, pak vlevo na **Pages**.
2. U **Source** vyber **GitHub Actions**.
3. Na záložce **Actions** počkej, až doběhne **Nasazení na GitHub Pages** (zelená fajfka). Adresa webu je `https://TVOJE-JMENO.github.io/mikroekonomie/`.

### 4. Odkazy v Supabase
V Supabase: **Authentication → URL Configuration**. Do **Site URL** i **Redirect URLs** vlož adresu webu z předchozího kroku a ulož.

### 5. Přidání na plochu telefonu
Android (Chrome): menu ⋮ → **Přidat na plochu**. iPhone (Safari): tlačítko sdílení → **Přidat na plochu**.

## Soukromí obsahu

- Zdrojové soubory z Moodlu (`Moodle_Mikroekonomie\`) a složka `content\` jsou v `.gitignore` a nikdy se nenahrávají.
- Pevné příklady ze cvičebnice patří jen do Supabase (tabulka `problems`, čitelná po přihlášení pozvaným e-mailům). Převod připraví `tools\problems-to-sql.mjs`.
- Pozor: výklad, generátory a banky tvrzení pravda/nepravda jsou v souborech `js\topics\`. Jsou napsané vlastními slovy, ale část tvrzení vychází z úkolů ano/ne ve cvičebnici. Při veřejném repozitáři jsou tedy čitelné všem. Pokud to nechceš, nasaď aplikaci z privátního repozitáře (placený plán) nebo tyto banky přesuň do Supabase.

## Offline režim

Na nasazené stránce se ukládají soubory aplikace a po výpadku připojení se otevře naposledy načtená verze. Přihlášení, zápis pokroku a knihovny načítané z internetu (vzorce, matematika) připojení vyžadují. Když si nejsi jistý, že vidíš novou verzi, obnov stránku (Ctrl+F5).
