---
title: Datoteke, shranjevanje in deljenje
summary: Kje ležijo tvoji načrti, kako jih varnostno shraniš, katere oblike layerling uvozi in izvozi in kaj je mogoče na skupnem strežniku.
---

## Kje ležijo tvoji načrti

layerling vse shranjuje v brskalniku na tvojem računalniku. Računa ni in nič se ne nalaga na splet. Vsaka sprememba se shrani sama. Sličica predogleda na začetni strani kaže pogled, ki si ga imel nazadnje pred seboj, ko si se z {{ui:editor.homeDashboard}} vrnil nazaj. Če layerling po nekaj dneh spet odpreš v istem brskalniku, je vse tam.

Če se iz načrta, v katerem ni nič, vrneš na začetno stran, layerling vpraša, ali naj ostane. {{ui:confirm.yes}} ali [[Enter]] ga obdrži, {{ui:confirm.no}} ga odstrani, da se ne kopičijo prazni načrti. Načrti v skupni mapi na strežniku so izvzeti.

To ima svojo slabo stran: kdor izbriše pomnilnik brskalnika ali preide na drug računalnik, izgubi načrte. **Zato pomembna dela shrani v datoteko.**

## Varnostno kopiranje in deljenje

Na začetni strani ima vsak načrt meni z možnostmi za preimenovanje, podvajanje in brisanje. Z {{ui:dashboard.backupAll}} vse načrte naenkrat spakiraš v eno samo datoteko. Prek {{ui:dashboard.importGeometry}} se vrnejo nazaj, tudi v drugem brskalniku ali na drugem računalniku. {{ui:myShapes.title}} tega brskalnika potujejo v isti datoteki, v mapi `Custom shapes`, glej [Oblike](chapter:oblike).

Posamezen načrt shraniš v urejevalniku: {{ui:editor.export}}, nato izberi obliko **LYL** in klikni {{ui:export.saveProject}}. Datoteka LYL je lasten načrtovalski format programa layerling in vsebuje vse: oblike, skupine, skice, podatke CAD, uvožene vire in zgodovino, torej korake razveljavitve. Pri {{ui:export.historyTitle}} izbereš, koliko zadnjih korakov naj potuje zraven; privzeto je to, kar nastavitve (zobnik v orodni vrstici) pod {{ui:workspace.history}} hranijo. Zadnja postaja, {{ui:export.historyNone}}, shrani načrt samo s trenutnim stanjem – tako ga deliš brez korakov razveljavitve. Izvoz je kopija pod {{ui:export.fileName}}, ki ga vpišeš; načrt v brskalniku obdrži svojo zgodovino. Starejše datoteke `.skf` iz prejšnjih različic je še vedno mogoče odpreti, shrani se potem kot `.lyl`.

**Shranjevanje v lastno mapo (Chrome in Edge).** Tam gumb odpre sistemsko okno za shranjevanje, tako da mapo in ime izbereš sam, obstoječo datoteko pa je mogoče nadomestiti. Potem [[Ctrl]]+[[S]] shrani načrt spet v isto datoteko, brez okna. Načrt, odprt iz datoteke `.lyl` z {{ui:dashboard.importGeometry}} ali z gumbom za odpiranje v oknu za izvoz, se shrani tudi nazaj vanjo. Brskalnik te lahko enkrat vpraša za dovoljenje za spreminjanje datoteke. Po ponovnem nalaganju strani načrt pozabi svojo datoteko in naslednji [[Ctrl]]+[[S]] jo spet vpraša; okno se odpre v mapi, ki si jo uporabil nazadnje. Firefox in Safari strani ne dovolita pisati v datoteke na ta način. Tam se datoteka kot prej prenese v mapo Prenosi, [[Ctrl]]+[[S]] jo prenese znova; v Firefoxu je mogoče pod Nastavitve, Splošno, Prenosi določiti, da vsakič vpraša za mapo.

## Izvoz

Klikni {{ui:editor.export}} ali pritisni [[Ctrl]]+[[E]].

![Okno za izvoz z oblikami STL, 3MF, OBJ, STEP, SVG, PNG in LYL.](shot:export-panel)

Zgoraj je ime datoteke, pod njim izbereš obliko. Če je kaj označeno, se izvozi samo izbor, sicer celoten načrt. Če izbor izpusti vidne dele, to jasno pove opomba v oknu, {{ui:export.selectAll}} pa z enim klikom označi vse vidno. Ko je datoteka zapisana, se okno samo zapre; če izvoz ne uspe, ostane odprto s sporočilom.

| Oblika | Za kaj | Kaj moraš vedeti |
| --- | --- | --- |
| **STL** | Rezalnik in 3D-tisk | Mreža trikotnikov. Najpreprostejša in najbolj razširjena oblika. |
| **3MF** | Rezalnik z barvami | Vsako telo ostane svoj del z imenom in barvo. Kar se prekriva, se združi samo pri enaki barvi; če oblika tiči v drugobarvni, na primer logotip v plošči, prva zgrajena tam naredi prostor za kasnejšo. Primerno za PrusaSlicer, Bambu Studio, OrcaSlicer in Curo. Bambu Studio in OrcaSlicer ob odpiranju vprašata, kako naj se barve porazdelijo na tvoje filamente, in datoteko imenujeta »ne od Bambu« – to sporočilo je neškodljivo. |
| **OBJ** | Modeliranje in izmenjava | Široko podprta oblika mreže. Barve so kot barve oglišč v isti datoteki, brez dodatne `.mtl`. Bambu Studio in OrcaSlicer jih preberta in kot pri 3MF vprašata po razporeditvi na filamente; drugi programi vidijo samo obliko. Prekrivajoča se telesa se kot pri 3MF združijo samo pri enaki barvi. |
| **STEP** | Polnovreden program CAD | Obdrži kvadre, valje, krogle in stožce kot natančno geometrijo, prav tako oblike iz obrisa (zvezda, srce, elipsa, cev, polkrogla, okrogla streha, zaobljen kvader, lastovičji rep, izvrtine in več), ukrivljeno cev, navoje, vzmeti in zobnike, poleg tega zaokrožitve in posnetja. Prvi izvoz STEP v seji enkrat naloži jedro CAD (približno 22 MB). |
| **SVG** | Laserski rezalniki in ploterji | Čist tloris v milimetrih, z luknjami in ukrivljenimi obrisi. |
| **PNG** | Prispevki na forumih, tiskarski portali, povpraševanja | Slika pogleda, kakršen je ravno zdaj, v dvojni ločljivosti in brez ročic, okvirja izbora in mer. {{ui:export.png.plate}} in {{ui:export.png.transparent}} izbereš v oknu. Prej zavrti in zumiraj, dokler izrez ne ustreza; izbor tu ne igra vloge. |
| **LYL** | layerling sam | Urejljiv načrt z vsem, kar spada zraven. |

**STL v lastno mapo (Chrome in Edge).** Tam prvi izvoz STL načrta odpre sistemsko okno za shranjevanje, tako da mapo in ime izbereš sam in lahko nadomestiš obstoječo datoteko. Potem vsak izvoz STL tega načrta zapiše v isto datoteko brez okna; okno za izvoz pokaže, katera je, **Shrani kot …** ob gumbu za izvoz pa izbere drugo. Okno si zapomni svojo mapo, ločeno od tiste za načrte, zato lahko datoteke za rezalnik ostanejo pri rezalniku. Po ponovnem nalaganju strani načrt pozabi svojo datoteko STL in naslednji izvoz spet vpraša. Firefox in Safari datoteko prenesejo kot prej.

Luknjo, ki je nisi združil v skupino, izvoz odšteje od vsakega telesa, ki se je dotika, tako kot kaže pogled. Pred vsakim izvozom torej ni treba združevati. Pri izboru štejejo samo izbrane luknje. Samo za sebe luknje ni mogoče izvoziti; na to te opozori layerling.

STEP vsebuje samo natančna telesa CAD. Kar ni mogoče natančno prikazati, na primer mreža, uvožena kot STL, ostane zunaj. Sporočilo po izvozu ta telesa imenuje po imenu in pove, zakaj. Za tiskalnik potem vzameš STL ali 3MF, ki prenesta vse.

### Koliko filamenta to potrebuje?

Pri STL, 3MF, OBJ in STEP polje {{ui:export.estimateTitle}} pokaže prostornino, težo in dolžino filamenta (1,75 mm) tistega, kar se izvaža. Šteje se kot v datoteki: samo vidna telesa, luknje odštete, prekrivanja samo enkrat. Desno izbereš filament – PLA, PETG, ABS, ASA, TPU ali PA (najlon) –, teža sledi njegovi gostoti. Računano je polno, torej kot s 100 % polnila. S stenami in polnilom rezalnik pokaže manj; številka je zgornja meja in dobro služi za primerjavo ter za to, ali kolut še zadošča.

## Uvoz

Prek {{ui:editor.import}} ali [[Ctrl]]+[[I]] v načrt prineseš tuje datoteke.

![Okno za uvoz: odpri ali vstavi načrte in odloži geometrijo.](shot:import-panel)

- **{{ui:import.openProject}}:** Načrt programa layerling (`.lyl` ali starejši `.skf`) pride nazaj kot nov načrt.
- **{{ui:import.insertProject}}:** Telesa načrta programa layerling pridejo zraven v odprtega. Praktično za osnovne oblike, ki jih potrebuješ znova in znova: zgradi jih enkrat, shrani in jih vsakič prinesi noter.
- **Dodaj geometrijo:** Datoteke STL, OBJ, 3MF, STEP ali SVG odloži v oknu ali klikni, da izbereš datoteko. Uvožene mreže lahko vrtiš, premikaš, režeš z luknjami in nato gradiš naprej. SVG pride kot skicirano telo, tudi tak iz sledilnika, kot je picsvg.com, ali Inkscapov »Trace Bitmap«: njegovi obrisi postanejo črte in krivulje skice, visoke 4 mm in od zgoraj berljive tako kot na risbi. V lastnostih nastaviš {{ui:prop.sketchFill}}, kot ploskev ali kot konturo zunaj, znotraj ali sredinsko, in z {{ui:prop.sketchSilhouette}} odpadejo luknje, glej [Skice](chapter:skice), razdelek »Polnilo in silhueta«. Same točke spreminjaš v skicirnem načinu. Samo zelo zapleten SVG z več kot 2500 črtami in krivuljami pride kot trdna mreža. Barvni OBJ ali 3MF pride kot eno telo na barvo, vsa na svojem mestu drugo glede na drugo. Pri OBJ so barve ali v sami datoteki, kot pri OBJ iz programa layerling, ali v `.mtl` ob njej. Tega izbereš zraven, ali pa uvoziš kar celoten ZIP, tako kot ga Tinkercad izda za OBJ. 3MF nosi barve sam, pri projektu iz Bambu Studia, OrcaSlicerja ali PrusaSlicerja pa vsak del dobi barvo svojega filamenta. 3MF z več objekti, na primer projekt z enim objektom na tiskalno ploščo, pride kot eno telo na objekt; modifikatorji, negativni volumni in blokatorji podpor iz rezalnika ostanejo zunaj. Kar je bilo v rezalniku naslikano na ploskve, layerling ne bere.

Načrt, shranjen z **novejšo različico programa layerling**, lahko vsebuje stvari, ki jih tvoja različica še ne pozna, na primer novo obliko, novo nastavitev ali lastne pisave. Če ga layerling zato ne more odpreti, sporočilo navede obe različici. Če se odpre, v opombi piše, da novejše tu lahko izgleda drugače. V obeh primerih pomaga, da stran naložiš znova: layerling.com vedno dostavi najnovejšo različico. Nameščena aplikacija si jo prinese ob naslednjem zagonu, na lastnem strežniku posodobitev namestiš sam.

Slike kot predlogo vstaviš v skicirnem načinu, glej [Skice](chapter:skice).

## Poenostavitev uvožene mreže

Skenirana ali modelirana mreža ima pogosto bistveno več trikotnikov, kot jih njena oblika potrebuje, in vsakega se vleče zraven pri premikanju, rezanju in shranjevanju. {{ui:simplify.title}} v skupini Spreminjanje (ali v meniju z desnim klikom na telo) pokaže mrežo, kakršna je, ob tistem, kar od nje ostane pri izbranem deležu njenih trikotnikov; oba pogleda se vrtita in zumirata skupaj, z miškinimi gumbi delovne ravnine. Določiš, koliko naj ostane, kot odstotek ali kot število trikotnikov, in {{ui:simplify.apply}} prevzame lažjo mrežo. Rezultat je preprosta mreža: pri rezultatu reza ali združitve odpadeta {{ui:group.edit}} in prvotni deli.

Rezanje, združevanje in preseki z uvoženo mrežo se izračunajo v tvojem brskalniku, zato nastavitve delovnega prostora omejujejo, koliko trikotnikov lahko taka mreža ima ({{ui:workspace.booleanTriangleLimit}}). Mreža čez mejo se ne obdela in sporočilo navede število njenih trikotnikov; mrežo najprej poenostavi ali mejo dvigni, če tvoj računalnik to zmore.

## Prijava napake

Če layerling naredi kaj nepričakovanega, shrani {{ui:editor.bugReport}}: povezava je spodaj v nogi ob forumu. To je datoteka ZIP, ker GitHub in mnogi forumi zavračajo goli .lyl: v njej sta tvoj načrt kot .lyl in kratka besedilna datoteka z različico, brskalnikom, velikostjo zaslona, zadnjimi sporočili in nastalimi napakami. Začetna stran odpre ZIP kot varnostno kopijo, ali pa ga razpakiraš in odpreš .lyl. Osebnih podatkov v njej ni. Datoteko priloži svojemu prispevku na forumu ali pri GitHubu, potem je napako mogoče ponoviti natanko s tvojim načrtom.

Če se layerling zaustavi z napako, se namesto prazne strani pokaže okno s sporočilom o napaki. V njem shraniš nazadnje v brskalniku shranjeno stanje načrta kot datoteko .lyl, se vrneš na pregled ali začneš nov načrt. Sporočilo o napaki iz okna in shranjena datoteka pomagata pri prijavi.

## Skupni načrti na strežniku

Če layerling teče na lastnem računalniku ali spletnem strežniku, lahko ponudi skupno mapo, v kateri vsi uporabniki odlagajo načrte. Na začetni strani se potem pokaže kot {{ui:dashboard.sharedProjects}}. Tam ustvarjaš mape, načrte premikaš z vlečenjem in iščeš po celotni mapi. Načrt, ki tam leži, se sam shrani nazaj tja. Lastne oblike na strežniku ležijo tam v mapi `Custom shapes`, glej [Oblike](chapter:oblike).

To ni hkratno urejanje: kdor odpre datoteko, dela na lastni kopiji. Če je medtem kdo drug datoteko spremenil, layerling prepiše zavrne.

Na layerling.com ta funkcija ni vklopljena. Kako jo nastaviš na lastnem strežniku, piše v [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.de.md#gemeinsame-entwürfe-im-netz).
