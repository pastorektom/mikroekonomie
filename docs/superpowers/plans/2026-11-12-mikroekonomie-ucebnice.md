# Mikroekonomie 1 – učebnice: plán implementace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sdílená webová aplikace (PC, Android, iOS, tablet) pro učení Mikroekonomie 1: výklad, procvičování s kontrolou, ekonomické grafy, kreslicí tabule, řešení krok za krokem, zkouškový režim (zápočet a zkouška) a pokrok každého uživatele zvlášť.

**Architecture:** Sesterská aplikace k Matice (`C:\Users\pasto\Documents\Claude\Matika`): statické soubory (HTML/CSS/ES moduly, bez build kroku) na GitHub Pages, Supabase jen pro přihlášení, pokrok a obsah příkladů. Společné jádro se **zkopíruje z Matiky a upraví** (ne sdílí); matematické části (matice, limity, Gauss) se vypustí a nahradí ekonomickými: typy odpovědí, knihovna ekonomických výpočtů, grafy křivek, zkouškový režim.

**Tech Stack:** JavaScript (ES moduly), math.js (výrazy), KaTeX (vzorce), SVG (grafy), Supabase JS (auth + Postgres), Node `node --test`, Service Worker (offline, bonus). Knihovny z CDN s pevnou verzí jako v Matice.

**Spec:** `docs/superpowers/specs/2026-11-12-mikroekonomie-ucebnice-design.md`

## Global Constraints

- Veškerý text v UI česky.
- Žádná AI za běhu, žádný klíč k AI, žádné průběžné náklady.
- Příklady jsou jen v Supabase tabulce `problems` (čitelné po přihlášení pozvaným e-mailům z `allowed_emails`), ne v repozitáři ani ve statických souborech; `content/`, `Moodle_Mikroekonomie/`, `node_modules/`, `.env` jsou v `.gitignore`. Repozitář s kódem je veřejný (privátní GitHub Pages vyžadují placený plán).
- V prohlížeči jen veřejný Supabase „anon“ klíč a adresa; tajné klíče a hesla nikdy v kódu, chatu ani gitu.
- Pořadí a názvy témat jako v Moodlu: 1 Úvod do ekonomického studia; 2 Trh a tržní mechanismus; 3 Chování spotřebitele a formování poptávky; 4 Nabídka na trhu výrobků a služeb; 5 Firma v podmínkách dokonalé konkurence; 6 Nedokonalá konkurence; 7 Trhy výrobních faktorů; 8 Trh práce; 9 Trh kapitálu a přerozdělování důchodů; 10 Celková rovnováha a tržní efektivnost; 11 Tržní selhání a mikroekonomická politika státu.
- Zápočtový test: 50 bodů, minimum 30 (60 %), 50 min. Zkouška: 20 bodů, minimum 12 (60 %), 50 min; A 19–20, B 17–18, C 15–16, D 13–14, E 12, pod 12 FX.
- Funguje na šířce 360 px až desktop, bez horizontálního posunu.
- Správnost každého příkladu se ověřuje nezávislým výpočtem v testech; žádný generátor bez takového testu.
- Ručně kreslené grafy se nikdy nehodnotí automaticky a nezapočítávají se do bodů a známky zkouškového režimu (jen zvlášť jako „zvládl / nezvládl“).
- Přepsané příklady mají v datech `source: { chapter, number }` (cvičebnice) pro ověření.

## Review Focus

- Zaokrouhlená odpověď (`3,33` místo `10/3`) a procenta (`25`, `25 %`, `25%`): uznat podle `tol` / `unit:'percent'`, odmítnout vzdálené. Test v úkolu 1.
- Cenová elasticita zadaná se záporným znaménkem nebo v absolutní hodnotě: uznat podle `abs`. Test v úkolu 1.
- Výběr více možností: pořadí nehraje roli, žádná ani příliš mnoho označených možností je chyba, ne výjimka. Test v úkolu 1.
- Generátor vyrobí nesmysl (záporná cena nebo množství v rovnováze, dělení nulou, konkurenční firma s nulovým výstupem): `verify` na 500 seedech to musí zachytit. Test v úkolu 6.
- Zkouškový režim: vypršení času odevzdá rozpracované, neodpovězené úlohy dají 0 bodů, hodnocení bez jediné automaticky kontrolované úlohy nehodí dělení nulou. Test v úkolu 9.
- Uživatel bez připojení nebo s vypršelým přihlášením: aplikace se nezhroutí, pokus se nezapíše dvakrát. Test v úkolu 3.
- Uživatel A nikdy nevidí pokrok ani výsledky zkoušek uživatele B. SQL test v úkolu 3.

---

## Struktura souborů

```
mikroekonomie/
  index.html, manifest.webmanifest, sw.js
  css/app.css, board.css, viz.css          (z Matiky)
  js/app.js, router.js, auth.js, progress.js, content.js, render.js, rng.js, config.js   (z Matiky, upraveno)
  js/checker-core.js, checker.js           kontrola odpovědí (nové typy)
  js/econ.js                               čisté ekonomické výpočty (rovnováha, elasticita, náklady, zisk…)
  js/exam.js                               pravidla zkouškového režimu (body, známka)
  js/formulas.js                           vlastní přehled vzorců
  js/ui/practice.js, inputs.js, whiteboard.js, stepper.js, theory.js, login.js, home.js, exam.js
  js/viz/board.js, common.js, plot.js      (z Matiky); econ.js (nové: křivky D, S, MC, AC…)
  js/topics/index.js, tema01.js … tema11.js
  supabase/schema.sql, rls_test.sql
  tools/problems-to-sql.mjs                (z Matiky)
  content/problems/                        (mimo git)
  tests/*.test.js, tests/topics/, tests/helpers/verify.js
```

## Společná rozhraní

```js
// js/topics/temaNN.js  default export (stejný tvar jako v Matice):
{ id: 'trh', title: 'Trh a tržní mechanismus', order: 2,
  theory: [{ heading, text, tex?, term?, mistakes?: string[] }],   // term = definice pro zkouškové otázky
  types: [{ id, title, generate(rng): data, solve(data): Problem }] }

// Problem
{ id, topic, type, data, task, promptTex?, hint?,
  part: 'zapocet' | 'zkouska',      // do kterého zkouškového režimu patří (výchozí 'zapocet')
  points: number,                   // výchozí 1
  answerSpec, answerTex?, conclusion?,
  source?: { chapter: number, number: number },
  solution: Step[] }                // neprázdné; Step = { title, text, board?: BoardLine[], viz? }

// answerSpec
{ kind: 'number',      value, tol?: number, unit?: 'percent', abs?: boolean }
| { kind: 'expression', value, variable }                       // lineární funkce, např. Q=100-2P
| { kind: 'choice',     value: string, options: {id, text}[] }
| { kind: 'multichoice',value: string[], options: {id, text}[] }
| { kind: 'truefalse',  value: boolean }
| { kind: 'table',      value: string[][], tol?: number }        // vyplnění tabulky (náklady, užitek)
| { kind: 'list',       value: number[] }
| { kind: 'whiteboard', reference: VizData }                     // vlastní náčrt, sebehodnocení

// js/checker.js
check(answerSpec, input: string | string[] | string[][] | boolean): { ok, reason?: 'syntax'|'wrong' }   // whiteboard nikdy nevolá check

// js/viz/econ.js
drawEcon(svgEl, { axes: { x: 'Q', y: 'P' }, curves: [{ expr, label, color?, dashed?, domain? }],
  points?: [{ x, y, label?, guides?: boolean }], areas?: [{ between: [exprA, exprB], from, to, label }],
  arrows?: [{ from: [x,y], to: [x,y], label? }], alt?: string })
```

---

### Task 1: Základ projektu a kontrola odpovědí

**Files:** Create `package.json`, `.gitignore`, zkopírovat z Matiky `js/rng.js`, `js/checker-core.js`, `js/checker.js` (upravit); Test `tests/checker.test.js`

**Interfaces:**
- Produces: `check(answerSpec, input)` pro všechny druhy z „Společných rozhraní“ kromě `whiteboard`.

- [ ] **Step 1:** `node --version` (Matika ho už používá); `git init`; `.gitignore` obsahuje `Moodle_Mikroekonomie/`, `node_modules/`, `.env`, `content/`, `.superpowers/`, `.playwright-mcp/`. `package.json` s `"type":"module"`, skript `test: node --test`, závislosti `mathjs@13.2.0`, `jsdom@25.0.1`. `npm install`.
- [ ] **Step 2: Failing testy** v `tests/checker.test.js`: `number` 10/3 s `tol:0.01` uzná `'3,33'` a `'10/3'`, odmítne `'3,3'`; `unit:'percent'` hodnota 25 uzná `'25'`, `'25 %'`, `'25%'`, odmítne `'0,25'`; `abs:true` hodnota 1.5 uzná `'-1,5'` i `'1,5'`; `choice` uzná správné `id`, odmítne jiné; `multichoice` `['a','c']` uzná `['c','a']`, odmítne `['a']`, `['a','b','c']` i `[]`; `truefalse` hodnota `true` uzná `true`; `table` s `tol` uzná `[['10','20'],['30','5']]` při přehozených zápisech `'10,0'`; `expression` `100-2*P` uzná `-2P+100`; nesmyslný vstup `abc((` vrátí `{ok:false, reason:'syntax'}` a nehodí výjimku; prázdný vstup `reason:'syntax'`.
- [ ] **Step 3:** `node --test tests/` selže. **Step 4:** Implementovat `check` (jádro z Matiky, vypustit matice, limity, soustavy, intervaly; doplnit `choice`, `multichoice`, `truefalse`, `table`, `tol`, `percent`, `abs`). **Step 5:** Testy projdou, commit.

### Task 2: Kostra aplikace

**Files:** Z Matiky zkopírovat a upravit `index.html`, `css/*`, `js/app.js`, `js/router.js`, `js/render.js`, `js/ui/stepper.js`, `js/ui/theory.js`, `js/viz/board.js`, `js/viz/common.js`, `js/topics/index.js` (seznam jen 11 prázdných témat); Test `tests/render.test.js`, `tests/board.test.js`

**Interfaces:**
- Produces: `renderTex`, `renderText` (text se nikdy nevkládá jako HTML), `mountStepper(el, steps)`, `drawBoard(el, lines, upTo)`, router `#/`, `#/tema/<id>/vyklad|procvicovani|postup`, `#/zkouska/zapocet|zkouska`, `#/vzorce`; texty v UI česky, název aplikace „Mikroekonomie 1“.

- [ ] **Step 1:** Převzít testy `render` a `board` z Matiky (např. `<img onerror=x>` nevytvoří `img`; `drawBoard` s `upTo=2` vykreslí 2 řádky). **Step 2–4:** Odstranit vše matematické (Gauss, matice, krokovače specifické pro matiku), upravit navigaci a barvy; testy projdou. **Step 5:** Ověřit v náhledu na 360 px a 1280 px, commit.

### Task 3: Přihlášení, pokrok a obsah (Supabase)

**Files:** Z Matiky zkopírovat `supabase/schema.sql`, `supabase/rls_test.sql`, `js/auth.js`, `js/progress.js`, `js/content.js`, `js/config.js` (prázdné), `js/ui/login.js`, `tools/problems-to-sql.mjs`; Test `tests/progress.test.js`; Create `docs/supabase-navod.md`

**Interfaces:**
- Consumes: `signUp`, `signIn`, `recordAttempt({topic,type,seed,answer,correct,ms,selfGraded?})`, `topicStats()`, `recommendNext(stats, order)` – shodně s Matikou.
- Produces: navíc tabulka `exam_runs(user_id default auth.uid(), kind text check in ('zapocet','zkouska'), points numeric, max_points numeric, self_graded_ok int, self_graded_total int, ms int, created_at)` s řádkovou ochranou jen vlastní řádky; `recordExam(run)`, `listExams(): run[]`.

- [ ] **Step 1:** Návod „klikni sem“ pro **nový** Supabase projekt (ne projekt Matiky), vložení URL a anon klíče do `js/config.js`; tajný klíč nikdy nechtít; poznámka o uspání bezplatného projektu po nečinnosti a jeho obnovení. Přidání pozvaných e-mailů SQL `insert into allowed_emails`.
- [ ] **Step 2: Failing testy:** převzít testy z Matiky (nepovolený e-mail, `problems` bez přihlášení, `recommendNext`, fronta při výpadku sítě, SQL test „A nevidí B“) a doplnit SQL test, že A nevidí `exam_runs` uživatele B. **Step 3–5:** Implementace, testy, commit.

### Task 4: Procvičování, zadávání odpovědí a kreslicí tabule

**Files:** Z Matiky zkopírovat a upravit `js/ui/practice.js`, `js/ui/inputs.js`, `js/ui/whiteboard.js`; Test `tests/practice.test.js`, `tests/whiteboard.test.js`

**Interfaces:**
- Consumes: `check`, `recordAttempt`, `Problem`.
- Produces: `mountPractice(el, topic)`; vstupy podle `answerSpec.kind`: číselné pole (čárka i tečka), přepínače `choice` / `multichoice` / `truefalse`, mřížka pro `table`; tlačítka „Zkontrolovat“, „Ukaž výsledek“, „Další příklad“, „Ukaž postup“. `mountWhiteboard(el, {onChange})` u každé výpočetní i grafové úlohy; u `whiteboard` se po „Ukaž výsledek“ vedle náčrtu zobrazí vzorový graf (`drawEcon(reference)`) a student označí „Zvládl jsem / Nezvládl jsem“ (zapíše se `selfGraded:true`).

- [ ] **Step 1: Failing testy:** špatná odpověď zapíše pokus `correct:false` a příklad zůstane; „Ukaž výsledek“ zapíše nezodpovězený pokus, ne správný; `selfGraded` pokus nese volbu studenta; `undo`/`clear` na tabuli jako v Matice; hláška `syntax` pokus nezapisuje. **Step 2–4:** Implementace (Pointer Events, `touch-action:none`). **Step 5:** Ověřit v náhledu na 360 px a emulovaném iPadu, commit.

### Task 5: Ekonomické výpočty a grafy křivek

**Files:** Create `js/econ.js`, `js/viz/econ.js`, `css/viz.css` (úprava); Test `tests/econ.test.js`, `tests/viz.test.js`

**Interfaces:**
- Produces v `js/econ.js` (čisté funkce, všechny pracují s lineárními i obecnými `Q(P)` danými koeficienty): `equilibrium({a,b,c,d})` pro `Qd=a-bP`, `Qs=c+dP` vrací `{P,Q}`; `elasticity(dQ, dP, P, Q, {midpoint})`; `incomeElasticity`, `crossElasticity`; `consumerSurplus`, `producerSurplus` (trojúhelník pod/nad cenou); `mrs`; `budgetLine`; `totalCost`, `marginalCost(fn, q)`, `averageCost`; `profitMaxCompetitive({price, mc})`; `monopolyOptimum({a,b, mcFn})` (MR = MC pro lineární poptávku); `breakEven`, `shutdown`.
- Produces `drawEcon(svgEl, data)` podle „Společných rozhraní“ (popisky P, Q, S, D, MC, AC, MR; šipky posunu; stínované plochy přebytků a zisku; vodicí čáry bodu na osy; vkládání popisků přes `textContent`).

- [ ] **Step 1: Failing testy:** `equilibrium({a:100,b:2,c:10,d:1})` → `{P:30, Q:40}`; `elasticity` středovým vzorcem pro `(Q 40→60, P 10→8)` je spočítaná ručně v testu; `consumerSurplus` pro `Qd=100−2P` při `P=30` je `(50−30)·40/2 = 400`; `monopolyOptimum` pro `P=100−Q`, `MC=20` → `Q=40, P=60`; `drawEcon` pro posun `D0→D1` má v SVG obě křivky a šipku, pro prázdná data nehodí výjimku, křivka D klesá a S roste (test sklonu z vykreslených bodů).
- [ ] **Step 2–4:** Implementace (vykreslení křivek přes `sampleCurve` z `viz/plot.js`). **Step 5:** Ověřit v náhledu na 360 px, commit.

### Task 6: Šablona tématu a první téma 2 (Trh a tržní mechanismus) jako svislý řez

**Files:** Create `js/topics/tema02.js`, `tests/topics/tema02.test.js`, `tests/helpers/verify.js`

**Interfaces:**
- Produces: vzor, který ostatní témata kopírují: `theory` (výklad vlastními slovy podle skript kap. 3 a prezentace 2, časté chyby, `term` u definic), aspoň 5 typů úloh podle cvičebnice kap. 3 (posun křivek a jeho příčiny jako `multichoice`, určení rovnováhy z rovnic `number`, přebytek/nedostatek při regulované ceně, substituty/komplementy `choice`, pravda/nepravda, zakreslení posunu `whiteboard`), každý s `generate(rng)`, `solve(data)`, `answerSpec`, `solution` o 3 a více krocích (tabule + popis). `verify(topic, n=500)`: pro `n` seedů ověří, že `check(answerSpec, správná hodnota)` je ok, `solution` je neprázdné, poslední krok obsahuje výsledek, nezávislý výpočet dá stejnou hodnotu a rovnovážná `P, Q > 0`.

- [ ] **Step 1:** Načíst cvičebnici přes `pymupdf` (text) a obrázky stran (grafy); sepsat typy úloh a odkazy `source` do hlavičky souboru. Pevné příklady ze cvičebnice jdou do `content/problems/trh.json` (mimo git) a přes `tools/problems-to-sql.mjs` do Supabase.
- [ ] **Step 2: Failing test:** `verify(tema02)` projde na 500 seedech. **Step 3–4:** Implementace; test projde. **Step 5:** Ověřit tři obrazovky tématu v prohlížeči; **zastavit a projít s uživatelem** srozumitelnost výkladu a správnost vzorových grafů, než se vyrobí ostatní témata. Commit.

### Task 7: Témata 3 a 4 (spotřebitel, nabídka firmy)

**Files:** Create `js/topics/tema03.js`, `tema04.js`, `tests/topics/tema03.test.js`, `tema04.test.js`

**Interfaces:** podle šablony z úkolu 6; každé téma samostatný úkol (různé soubory). Cvičebnice kap. 4 (téma 3) a kap. 5 (téma 4).

- [ ] **Step 1:** Projít kapitoly a prezentace 3 a 4, přepsat typy úloh se `source`. **Step 2:** Failing `verify`; implementace; pass. **Step 3:** Obsah: celkový a mezní užitek, rozpočtové omezení a optimum spotřebitele (MU_X/P_X = MU_Y/P_Y), indiferenční křivky, Engelova křivka, elasticity poptávky (cenová, důchodová, křížová); produkční funkce, náklady (explicitní/implicitní, TC, AC, MC), izokvanta a izokosta, zlaté pravidlo maximalizace zisku; úlohy s vyplněním tabulky. **Step 4:** Commit po každém tématu.

### Task 8: Témata 5 a 6 (dokonalá konkurence, nedokonalá konkurence)

**Files:** Create `js/topics/tema05.js`, `tema06.js`, `tests/topics/tema05.test.js`, `tema06.test.js`

**Interfaces:** podle šablony; cvičebnice kap. 6 a 7.

- [ ] **Step 1–2:** Jako v úkolu 7. **Step 3:** Obsah: `P = MC`, zisk a ztráta v grafu, bod uzavření a bod vyrovnání, krátkodobá a dlouhodobá nabídka firmy a odvětví, teorém pavučiny (konvergující, divergující); monopol (`MR = MC`, cena z poptávky, zisk, mrtvá ztráta, regulace), oligopol, kartel, monopolistická konkurence. Grafové úlohy jako `whiteboard` se vzorem. **Step 4:** Commit po každém tématu.

### Task 9: Zkouškový režim

**Files:** Create `js/exam.js`, `js/ui/exam.js`; Test `tests/exam.test.js`

**Interfaces:**
- Consumes: `Problem.part`, `Problem.points`, `check`, `recordExam`.
- Produces: `gradeExam(kind, points): { passed, grade }` (zápočet: 30/50 → `passed`; zkouška: A 19–20, B 17–18, C 15–16, D 13–14, E 12, jinak FX); `buildExam(kind, topics, rng): Problem[]` (zápočet: počítané úlohy do 50 bodů; zkouška: otázky na definice, vztahy a grafy do 20 bodů, vždy aspoň jedna úloha z každého hotového tématu); `mountExam(el, kind)` s časovačem 50 minut, po vypršení se odevzdá; výsledek ukáže body z automaticky kontrolovaných úloh a **zvlášť** „kreslených grafů zvládnuto X z Y“ (do bodů se nezapočítají).

- [ ] **Step 1: Failing testy:** `gradeExam('zkouska', 12)` → E, `11` → FX, `20` → A, `19` → A, `18` → B; `gradeExam('zapocet', 30)` → passed, `29` → ne; `buildExam('zapocet', …)` má součet bodů 50 a stejný seed dá stejný test; po vypršení času se neodpovězené úlohy počítají za 0 a nehodí výjimku; test bez jediné automaticky kontrolované úlohy nehodí dělení nulou. **Step 2–4:** Implementace, pass. **Step 5:** Ověřit v náhledu (časovač, odevzdání, přehled chyb s odkazem na výklad), commit.

### Task 10: Domovská obrazovka a přehled vzorců

**Files:** Create `js/formulas.js`, `js/ui/home.js`; Test `tests/formulas.test.js`

**Interfaces:**
- Produces: vlastní přehled vzorců po tématech označený „Vlastní přehled, nejde o oficiální materiál ke zkoušce“; domovská stránka s kartami 11 témat, ukazatelem pokroku, doporučením z `recommendNext`, odkazy na zkouškové režimy a poslední výsledky z `listExams`.

- [ ] **Step 1: Failing test:** každý vzorec se vykreslí KaTeXem bez chyby. **Step 2–4:** Implementace, pass. **Step 5:** Commit.

### Task 11: Offline a první nasazení

**Files:** Create `manifest.webmanifest`, `sw.js`, `README.md`, `.github/workflows/pages.yml`

- [ ] **Step 1:** Service Worker ukládá jen vlastní soubory; přihlášení a zápis pokroku vyžadují připojení. **Step 2:** Návod krok po kroku („klikni sem“) pro uživatele-začátečníka: vytvoření veřejného repozitáře na GitHubu (kód bez obsahu příkladů), zapnutí GitHub Pages, vložení klíčů do `js/config.js`. Před nahráním ověřit `git ls-files | findstr /i "Moodle content"` bez výstupu. **Step 3:** `node --test tests/` projde celé. **Step 4:** Kontrola v prohlížeči s emulací telefonu a tabletu; seznam ručních kontrol pro uživatele (Android, iPhone, iPad, přidání na plochu) a čekání na jeho screenshoty. **Step 5:** Nahrání a nasazení až po výslovném souhlasu uživatele (zveřejnění je vnější akce).

### Task 12: Zbývající témata 1 a 7–11 a doplňující nasazení

**Files:** Create `js/topics/tema01.js`, `tema07.js` … `tema11.js` a testy v `tests/topics/`

**Interfaces:** podle šablony; po každém tématu aktualizovat `js/topics/index.js`, vzorce a znovu nasadit.

- [ ] **Step 1:** Pro každé téma projít prezentaci a odpovídající kapitoly (téma 1: kap. 1, 2 a matematické nástroje; téma 7: kap. 8; téma 11: skripta kap. 12; u témat 8–10 zjistit čísla kapitol z obsahu cvičebnice a skript). **Step 2:** Failing `verify`, implementace, pass. **Step 3:** Obsah pro zkoušku: definice a vztahy (`choice`, `truefalse`, `multichoice`), tvorba grafů (`whiteboard` se vzorem): hranice produkčních možností, poptávka firmy po faktoru (VMP = MRC), rovnováha na trhu práce, minimální mzda, Lorenzova křivka, Edgeworthův diagram, externality (pozitivní a negativní), veřejné statky, asymetrické informace. **Step 4:** Commit po každém tématu a nasazení po souhlasu uživatele.

---

## Kontrola proti návrhu

- Výklad, procvičování, grafy, kreslicí tabule, tabule s řešením: úkoly 2, 4, 5, 6–8, 12.
- Zápočtový a zkouškový režim s body a známkou, odděleně kreslené grafy: úkol 9.
- Pokrok po uživatelích a soukromí obsahu (pozvané e-maily, příklady jen v databázi): úkoly 1 a 3, kontrola v úkolu 11.
- 11 témat v pořadí z Moodlu: úkoly 6–8 a 12; vydávání po tématech (zápočtová počítaná témata 2–6 jako první): úkoly 6–11.
- Mobil, česky, vzorce, doporučení, správnost nezávislým výpočtem: úkoly 2, 10, 5–8, 12.
- Rizika zbývající po plánu: kvalita ručního čtení grafů z obrázků cvičebnice (úkoly 6–8 a 12, krok 1) a to, že konkrétní příklady ze seminářů uživatel nemá, takže zápočtové úlohy jsou odvozené jen z typů ve cvičebnici.
