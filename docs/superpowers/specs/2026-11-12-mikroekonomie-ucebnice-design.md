# Interaktivní aplikace pro učení Mikroekonomie 1 – návrh

## Účel a proč
Student FaME UTB (předmět Mikroekonomie 1, kurz Moodle id 12146, ZS 2026/27) se chce z materiálů v Moodlu učit interaktivně a ne jen číst PDF a prezentace. Aplikaci chce dát i spolužákům. Je to sesterská aplikace k již hotové aplikaci **Matika** (`C:\Users\pasto\Documents\Claude\Matika`, Matematika E1): stejná architektura a stejné principy, jiný obsah.

Cíl: zvládnout **zápočtový test** a **zkoušku**.
- Zápočtový test: 14. 12. 2026 v 8:00 (opravný 5. 1. 2027), 50 bodů, na zápočet 30 (60 %), čistý čas 50 min. Obsahem jsou **příklady ze seminářů** (uživatel je nemá, má jen cvičebnici). Za dotazník lze získat bonus (to se aplikace netýká).
- Zkouška: písemný test, 20 bodů, minimum 12 (60 %), 50 min. Stupnice A 19–20, B 17–18, C 15–16, D 13–14, E 12. Obsahem je **tvorba základních grafů, vztahů, definic a souvislostí** ze všech 11 témat přednášek. Následuje dobrovolné ústní dozkoušení.

## Cíle
1. **Výklad** všech 11 témat: pojmy, vzorce, grafy, typické chyby.
2. **Procvičování** zadání podle cvičebnice. Výpočty se kontrolují početně (ekvivalentní tvar výsledku je správně), úlohy s výběrem z možností a pravda/nepravda se vyhodnotí hned. Část zadání se generuje náhodně (čísla), aby šlo cvičit opakovaně.
3. **Grafy:** aplikace kreslí interaktivní grafy (poptávka, nabídka, náklady, monopol, mezní užitek, indiferenční křivky, rozpočtová přímka, izokvanty…), ukazuje posuny křivek a tržní rovnováhu.
4. **Kreslicí tabule:** u grafových úloh si student graf sám nakreslí (prst, myš, pero) a pak porovná se vzorem. Je to hlavní příprava na zkoušku.
5. **Řešení krok za krokem** na „školní tabuli“ (tmavé pozadí, rukopisné písmo, postupné psaní, barevné poznámky) s popisem „Krok N z M“, možnost krokovat vpřed/vzad.
6. **Zkouškový režim:** otázky na definice a vztahy a časované nanečisto (50 min), odděleně pro zápočet (příklady, 50 bodů) a zkoušku (grafy a definice, 20 bodů), s přepočtem na body a známku.
7. **Pokrok po uživatelích:** přihlášení e-mailem a heslem, každý vidí jen svůj pokrok. Zaznamenává se každý pokus. Aplikace doporučuje, co procvičit příště, podle chybovosti po tématech.
8. Funguje na počítači, Androidu, iPhonu i iPadu (responzivní, přidatelné na plochu), sdílitelné odkazem.
9. Veškerý text v UI **česky**.

## Mimo rozsah a nežádoucí výsledky
- **Žádné AI za běhu**, žádný klíč k AI, žádné průběžné náklady. Vše je napsáno předem.
- Aplikace **nesmí být veřejná**: soukromý repozitář, registrace jen pro pozvané e-maily, obsah příkladů se načítá až po přihlášení. Stažené soubory (PDF, PPTX) se nenahrávají; do aplikace jdou přepsané příklady, výklad a postupy.
- Nepřebírat doslova text skript ani prezentací jako celek; výklad je vlastní zhuštěný.
- Neúspěch: špatně vyhodnocené správné řešení, ekonomicky nesprávné postupy a grafy (např. křivka posunutá špatným směrem), nepoužitelné na telefonu.
- **Neodhadovat to, co v materiálech není:** konkrétní příklady ze seminářů uživatel nemá. Zápočtové příklady se proto odvozují z typů úloh ve cvičebnici; v aplikaci to bude řečeno otevřeně.

## Rozhodnutí uživatele
- Aplikace „jako Matika“, ale pro mikroekonomii; obsah z kurzu v Moodlu.
- Podoba schválená v konverzaci: výklad, procvičování, grafy, kreslicí tabule, tabule s řešením, zkouškový režim, pokrok po uživatelích, mobil.
- Technologie jako Matika: HTML/JS, GitHub Pages, Supabase pro přihlášení a pokrok.
- Jediný zdroj příkladů: cvičebnice (86 stran). K ní skripta a 11 prezentací pro výklad a zkouškové otázky.

## Moje volby (ať je uživatel zkontroluje)
- **Základ převzít z Matiky** (`js/router.js`, `auth.js`, `progress.js`, `rng.js`, board/whiteboard, `css/`, `tools/problems-to-sql.mjs`, `supabase/`, testovací nastavení `node --test`). Matematická část (mathjs, checkery matic a limit) se nahradí ekonomickou: kontrola čísel a zlomků s tolerancí, výběr z možností, pravda/nepravda, jednoduché rovnice (rovnováha, elasticita, náklady).
- Nový Supabase projekt a nový GitHub repozitář (ne sdílet s Matikou), v aplikaci jen veřejný „anon“ klíč. Tajné klíče a hesla se nikdy nevkládají do chatu ani do gitu.
- Grafy jsou vlastní SVG/Canvas komponenty (křivky z funkcí, posuvníky pro posun, popisky P, Q, S, D, MC, AC…), bez těžké knihovny.
- Kreslicí tabule pro grafy se srovnává se vzorem **vizuálně** (student vidí svůj náčrt a vzor vedle sebe, případně vzor přes něj) a **sám si označí „zvládl jsem / nezvládl“**. Automatické hodnocení ručního náčrtu se nedělá.
- Pořadí a názvy témat jako v Moodlu: 1 Úvod do ekonomického studia; 2 Trh a tržní mechanismus; 3 Chování spotřebitele a formování poptávky; 4 Nabídka na trhu výrobků a služeb; 5 Dokonalá konkurence; 6 Nedokonalá konkurence; 7 Trhy výrobních faktorů; 8 Trh práce; 9 Trh kapitálu a přerozdělování důchodů; 10 Celková rovnováha a tržní efektivnost; 11 Tržní selhání a mikroekonomická politika státu.
- Obsah se píše po tématech; zdrojové soubory jsou ve `Moodle_Mikroekonomie` (PDF text se čte přes pymupdf, protože `pdftotext` kazí diakritiku; grafy a vzorce ze skenů i z obrázků stran).
- Přepsané příklady mají u sebe odkaz na zdroj (kapitola a číslo úlohy ve cvičebnici), aby šlo ověřit správnost.
- Správnost: každý generátor a každé ručně napsané řešení má test proti nezávislému výpočtu; u grafů test, že křivky mají správný sklon a posun.
- Vzorce a přehled: vlastní, označený jako neoficiální.
- Testování: v prohlížeči počítače s emulací telefonu a tabletu; uživatel pak ověří na vlastních zařízeních.
- Nasazení skriptované a popsané krok po kroku („klikni sem“), uživatel je začátečník na Windows.

## Doplnění po kontrole návrhu (ať je uživatel zkontroluje)
Odpovězeno z projektu:
- **Cesty:** Matika je v `C:\Users\pasto\Documents\Claude\Matika` (funkční, hotová, má vlastní návrh i plán v `docs\superpowers`; nejdřív přečíst její návrh a `supabase\schema.sql`). Zdrojové soubory jsou v `C:\Users\pasto\Documents\Claude\Mikroekonomie\Moodle_Mikroekonomie`: `Skripta - Mikroekonomie I.pdf`, `Cvičebnice - Mikroekonomie I (2).pdf` (86 stran, **textové PDF**, čte se přes `pymupdf`; grafy jsou obrázky), `Tema 01…11 *.pptx`.
- **Přístup a hosting** řeší Matika a převezme se: GitHub Pages z veřejného repozitáře jen s kódem (privátní repozitář by vyžadoval placený plán), **příklady jsou jen v Supabase tabulce `problems`** čitelné po přihlášení, registrace jen pro e-maily v tabulce `allowed_emails`. Stažené soubory se nikdy nedávají do gitu (`.gitignore`).
- **Pozvané e-maily** spravuje uživatel v Supabase (SQL `insert into allowed_emails`), bez správcovské stránky v aplikaci; postup krok po kroku jako v `docs\supabase-navod.md` v Matice.
- **Výsledky ve cvičebnici:** jsou jen u části úloh (v kapitolách „E) Řešení“, např. s. 5, 16, 27, 36–38, 44–45, 50–76, 85); u mnoha je jen odkaz na obrázek či tabulku. Přepsaná řešení se proto kontrolují nezávislým výpočtem a tam, kde cvičebnice výsledek má, i proti němu. Ověření ekonomického obsahu zbývá na uživateli (zkontroluje první hotové téma proti své znalosti cvičení).

Moje volby:
- **Pořadí a vydávání po tématech:** nejdřív společné jádro převzaté z Matiky a témata důležitá pro zápočet (počítané úlohy: 2 trh, 3 spotřebitel, 4 a 5 firma, 6 monopol), pak ostatní (hlavně grafy a definice pro zkoušku). Aplikace se nasadí hned po prvních tématech a další se přidávají; uživatel se tak může učit dřív než 14. 12.
- **Bodování zkouškového režimu:** úlohy s automatickou kontrolou se počítají do bodů; ručně kreslené grafy se **hodnotí zvlášť** (vlastní „zvládl / nezvládl“) a do odhadu známky se nezapočítávají; zobrazí se samostatně, aby se výsledek nezdál nafouknutý.
- **Rozsah uživatelů:** desítky lidí, bezplatný plán Supabase stačí. V návodu bude upozornění, že se bezplatný projekt po delší nečinnosti pozastaví a jde obnovit jedním kliknutím.

## Zbývá na builderovi
Rozložení stránek a vzhled (může se přiblížit Matice), přesný seznam typů úloh v každém tématu (podle cvičebnice), generátory čísel, způsob zadávání odpovědí, jednotlivé grafické komponenty a jejich ovládání, struktura databáze pokroku, doporučování, bodování zkouškového režimu, postup nasazení, testy, pořadí tvorby témat.
