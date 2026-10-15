---
title: Merjenje in opombe
summary: Merilni trak, ravnilo in kotno ravnilo, razdalje do ničle – in opombe, ki visijo na delu.
---

Kdor želi del zgraditi natančno, mora znati meriti. layerling ima za to več orodij. Nobeno ne pride v izvoz. Debeline sten in reže v notranjosti najbolje izmeriš v [prereznem pogledu](chapter:pogled-in-delovna-ravnina) z {{ui:camera.sectionMeasure}}.

## Merilni trak

Merilni trak je na spodnjem koncu vrstice kamere ob levem robu ({{ui:camera.tapeTools}}). Meri razdalje med vogali, robovi in ploskvami. Klik nanj odpre pet gumbov. Če zakrivajo tisto, kar želiš izmeriti, jih za ročaj levo prosto povlečeš po delovni površini; dvoklik na ročaj jih vrne nazaj:

![Merilni trak z gumbi: Dodaj mero, Premakni merilne točke, Odstrani mero, Cele robove, Odstrani vse mere.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klikni točko, povleci do naslednje in jo klikni. Razdalja se označi.
2. **{{ui:camera.moveMeasurement}}:** Primi točke in jih premakni, številka sledi.
3. **{{ui:camera.deleteMeasurement}}:** Potem klikneš mero, da jo odstraniš.
4. **{{ui:camera.tapeWholeEdges}}:** Klik na rob izmeri ves rob, na primer obseg kroga. Ko je to stikalo izklopljeno, klik namesto tega postavi točko na rob, druga točka pa je lahko kjer koli, tako da lahko izmeriš premer ali katero koli drugo razdaljo. [[Alt]] stikalo obrne za en klik. Pri krogu se točka čez, nasproti prve, pripne, ko se kazalec približa, točki pa ležita na pravem krogu, zato je premer natančen.
5. **{{ui:camera.deleteAllMeasurements}}:** Odstrani vse mere naenkrat. Ker se tega ne da razveljaviti, layerling prej vpraša; če mer ni, se nič ne zgodi.
6. **{{ui:camera.tapeMarkMiddle}}:** Pod številko vsake meritve je majhen gumb s križcem. Na sredino meritve postavi [referenčno točko](#referencne-tocke): po kliku na okrogli rob, na primer rob luknje, v središče tega kroga – tudi pri uvoženi mreži, kjer sicer nič ne označuje sredine luknje –, pri premeru ali kateri koli ravni meritvi pa na sredino poti. Oblika, ki jo potem vlečeš, se s sredino zaskoči na točko. Točke, ki že obstaja, ne naredi dvakrat. Merilni trak se zaskoči na referenčno točko kakor na oglišče, zato lahko meriš od središča kroga ali od sredine črte: označi jo, nato klikni točko.

S [[Esc]] zapustiš način merjenja.

## Ravnilo

Iz knjižnice oblik vzameš {{ui:shape.ruler}}. To je čisto merilno orodje: ne pojavi se v nobenem izvozu in ga ni mogoče združiti v skupino ali presekati. Za vsako telo, ki se ravnila dotika ali se z njim prekriva, pokaže razsežnost kot lebdečo številko neposredno v pogledu. To številko lahko spremeniš kar tam in telo se prilagodi. Prek lebdečega simbola plus ustvariš kopijo izmerjene oblike.

## Kotno ravnilo

Včasih je bolje meriti ob pravem kotu. V vrstici kamere klikni {{ui:camera.cornerRulerTool}} in nato na delovno površino. Tam se odloži kotno ravnilo z dvema krakoma v pravem kotu, s črticami, kot kotnik. Tudi to nima lastnega telesa. Če klikneš blizu vogala telesa, se njegov vogal tam natanko zaskoči.

Kotno ravnilo se položi na delovno ravnino. Če leži na strani telesa, torej leži tudi ono na tej strani, glej [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina). Tako izmeriš na navpični steni: položi delovno ravnino na steno, kotno ravnilo postavi v njen zgornji levi vogal in toliko krat klikni na ročaj, da kraka kažeta v desno in navzdol.

- **Vlečenje za ročaj** ga premakne.
- **Kratek klik na ročaj** ga zavrti za 90°.
- **×** ob njem ga odstrani.
- **Majhen gumb levo od ročaja** preklopi, od kod se meri: od zunanjega roba telesa (oglišče, simbol s črtami) ali od njegove sredine (središče, nitni križ). Majhno stikalo iste vrste je ob vsaki zeleni številki in nastavi samo to številko: pri stoječem valju sredino v obeh krakih in dno po višini, pri ležečem sredino počez in konec po dolžini. Ko se vse tri spet ujemajo, gumb pri ročaju pokaže skupni način.

Če ob enem od krakov stojijo telesa, kotno ravnilo samodejno pokaže njihove mere. To gre samo na osnovni plošči, ne na strani telesa.

Če označiš telo, kotno ravnilo zeleno pokaže, kako daleč je od vogala, vzdolž obeh krakov in v višino. Klik na zeleno številko odpre vnosno polje: vpiši želeno razdaljo in telo se premakne natanko tja. Če je označenih več teles, štejejo skupaj kot eno. Meri se njihov skupni obris in vpisana vrednost premakne vse skupaj, ne da bi se njihova lega drugo glede na drugo spremenila.

S središčem zelene številke štejejo do sredine telesa, tudi v višini. Tako na primer postaviš kroglo s sredino natanko 15 mm ob rob, ne da bi odštel polmer. Na steni tako postaviš luknjo 40 mm z leve in 190 mm od zgoraj: označi luknjo, vklopi središče, vpiši 40 in 190. Višina tam šteje od stene navzven.

Merilni trak in kotno ravnilo ostaneta tam, kjer sta, ko skiciraš in se vrneš v 3D pogled. Z načrtom nista shranjena in ju ni v zgodovini; izgineta, ko stran naložiš znova.

## Razdalje do ničle in pri premikanju

V nastavitvah pod {{ui:workspace.appearance}} sta dve stikali za tekoče mere:

- {{ui:workspace.showMoveDimensions}} pri premikanju pokaže, za koliko se premikaš.
- {{ui:workspace.showOriginDimensions}} pokaže razdalje izbora do ničle plošče, tudi pri več označenih telesih.

Z {{ui:workspace.dimensionsAlwaysVisible}} mere ostanejo trajno vidne.

## Opombe

Opomba zabeleži, česar geometrija ne pove: »Tu je vijak 0,3 mm preozek«, »Pokrov še natisniti«, »Mera od Petra«. Postaviš jo z {{ui:editor.tool.note}} ali s tipko [[N]].

- Če opombo postaviš **na telo**, potuje z njim.
- Če jo postaviš **zraven**, ostane na delovni ravnini ({{ui:note.free}}).
- {{ui:note.detach}} prikovano opombo loči od telesa.
- Vlečenje opombo premakne, klik jo odpre za urejanje.
- Med pisanjem [[Enter]] obdrži besedilo, [[Esc]] ga vrne, kot je bilo pred začetkom, [[Shift]]+[[Enter]] pa začne novo vrstico.

Opombe se shranijo v načrtu, ne pojavijo se v nobenem izvozu in jih lahko prikažeš ali skriješ prek {{ui:visibility.notes}}.

## Referenčne točke

Referenčna točka je zgolj oznaka v prostoru, kot svinčnikova črta ali točka za zarisovanje v delavnici: ne spada k nobenemu telesu, nikoli se ne natisne in druge stvari se nanjo zaskočijo. Z desnim gumbom klikni na telo in izberi {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} ali {{ui:contextMenu.markMidpoints}}: točke se pokažejo na zgornji strani telesa (celotnega izbora, če si jih izbral več).

- Povleci točko, da jo premakneš, ali jo klikni, da vidiš njene koordinate in vpišeš nove; veljajo v nastavljeni enoti. Vsako kartico lahko za naslov povlečeš stran, če kaj zakriva, samo zase: druge ostanejo, kjer so, dvoklik na naslov pa jo vrne nazaj. Kartica, katere si se nazadnje dotaknil, stoji pred drugimi. **Izbriši vse** v kartici ali v meniju z desnim klikom izbriše vse točke naenkrat. {{ui:common.delete}} jo odstrani.
- Ko vlečeš obliko, se njeni robovi in sredina zaskočijo na točko, kot se zaskočijo na druge oblike ({{ui:workspace.objectSnap}}). Tudi kotno ravnilo se zaskoči na točke.
- Tudi merilni trak lahko označi točko: {{ui:camera.tapeMarkMiddle}}, gumb s križcem pod meritvijo, jo postavi na njeno sredino, na primer v središče okrogle luknje. Od točke tudi meri: trak se zaskoči na referenčne točke kakor na oglišča.
- Točke se shranijo v načrtu, ne pojavijo se v nobenem izvozu in se skupaj z opombami prikažejo ali skrijejo prek {{ui:visibility.notes}}.
- Umetna inteligenca jih lahko postavi, našteje in odstrani z `layerling_add_reference_points`, `layerling_list_reference_points` in `layerling_remove_reference_points`.
