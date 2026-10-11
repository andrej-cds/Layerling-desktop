---
title: Besedilo in ukrivljen napis
summary: Napisi dvignjeni ali vdolbeni, s sedmimi pisavami ali z lastno – in po želji vzdolž krožnega loka, na primer na kovancu, pokrovu ali obroču.
---

## Dodajanje besedila

V knjižnici oblik izberi {{ui:shape.text}} in ga odloži. V polje {{ui:prop.text}} desno vpišeš, kaj naj tam piše. Nastavitve pod njim:

- **{{ui:prop.font}}:** Na voljo je sedem pisav: Multilanguage, Sans, Serif, Script, Monospace, Rounded in Stencil (črke iz ravnih črt). Novo besedilo se začne v Sans. Šumniki in znaki € so v vsaki pisavi. Lastne pisave se dodajo, glej [Lastne pisave](#lastne-pisave) spodaj.
- **{{ui:nameTag.letterSize}}:** Kako velike so črke, gledano od zgoraj; {{ui:prop.height}} določa, kako debele so.
- **{{ui:prop.height}}:** Kako visoko pisava štrli iz ploskve.
- **{{ui:prop.bevel}}:** Zaobli robove črk, da delujejo mehkeje. Z {{ui:prop.segments}} določiš, v koliko stopnjah.
- **Velikost:** Dolžino in širino vrstice nastaviš kot pri vsaki obliki. Povleci ročice ali vpiši mere.

Besedilo je sprva eno samo telo. Če želiš črke obravnavati posamezno, klikni {{ui:inspector.separateParts}}. Potem je vsaka črka lastna oblika.

Tudi robove pisave lahko posnameš ali zaobliš, ravno ali ukrivljeno, glej [Posnetje robov in izdolbljenje teles](chapter:robovi-in-izdolbljenje). Vzemi majhne mere, kot 0,2 do 0,5 mm, saj so poteze črk ozke.

## Lastne pisave

Poleg sedmih priloženih pisav lahko vzameš katerokoli lastno pisavo: datoteko pisave z računalnika ali, v Chromu in Edgeu, pisavo, ki je nameščena na tvojem računalniku. Za to pod {{ui:prop.font}} čisto spodaj izberi {{ui:font.manage}}. Odpre se okno {{ui:font.title}}.

- **{{ui:font.addFile}}** sprejme datoteko TrueType (`.ttf`), datoteko OpenType (`.otf`) ali datoteko WOFF (`.woff`). Datoteko lahko tudi preprosto povlečeš v okno.
- **V Windowsih** so nameščene pisave v mapi »Pisave« (`C:\Windows\Fonts`). Pogovorno okno za datoteke v brskalniku jo skrije. Namesto tega jo odpri v Raziskovalcu in povleci želeno pisavo v okno {{ui:font.title}}. Pisave, ki so nameščene samo zate, ležijo v `%LOCALAPPDATA%\Microsoft\Windows\Fonts`; to mapo pokaže tudi pogovorno okno za datoteke. Na Macu so pisave v `/Library/Fonts` in `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** našteje pisave, nameščene na tvojem računalniku. Prvič brskalnik vpraša, ali jih sme layerling brati. Prek iskalnega polja hitro najdeš pisavo, klik jo prevzame.

Če je ravno izbrano besedilo, takoj dobi novo pisavo. Sicer je potem pod {{ui:prop.font}} v skupini {{ui:font.customGroup}}, z {{ui:font.use}} v oknu pa jo nastaviš na izbrana besedila. Lastne pisave se obnašajo kot priložene: besedilo na krožnem loku, posnetja in zaokrožitve na robovih ter izvoz STEP delujejo enako. Črke, ki jih pisava nima, layerling vzame iz Sans.

### Kaj gre v katerem brskalniku

| Brskalnik | Izbira datoteke pisave | Pisava z računalnika |
| --- | --- | --- |
| Chrome in Edge na računalniku, tudi nameščena aplikacija layerling | da | da, po vprašanju brskalnika |
| Firefox | da | ne |
| Safari na Macu | da | ne |
| Tablica in telefon | da, iz datotek naprave | ne |

Spletne strani ne smejo kar brati nameščenih pisav. Samo Chrome in Edge imata za to lastno dovoljenje, in še to samo na varnih straneh, torej prek `https`, kot pri layerling.com. Če layerling teče prek `http`, na primer na lastnem strežniku ali kot namestitev Docker v domačem omrežju, {{ui:font.fromSystem}} manjka; potem pisavo povlečeš iz Raziskovalca. V drugih brskalnikih izbereš datoteko pisave iz mape s pisavami, rezultat je enak. Če si vprašanje v Chromu ali Edgeu zavrnil, dostop spet omogočiš v nastavitvah spletnega mesta, prek ključavnice levo od naslova.

Česar layerling ne zna brati, so datoteke WOFF2 (za to skoraj vedno obstaja različica TTF ali OTF), zbirke pisav (`.ttc`, vsebujejo več pisav v eni datoteki) in barvne pisave emojijev. Pri zelo velikih pisavah, na primer za kitajščino, layerling vzame prvih 8000 znakov. Pri spremenljivih pisavah velja osnovna nastavitev pisave, običajno normalna različica.

Nekatere pisave, predvsem pisane in spremenljive, črko narišejo iz potez, ki se prekrivajo. layerling jih ob branju združi v čist obris, da telo ostane tiskljivo. Take črke potem sestojijo iz zelo kratkih ravnih kosov namesto iz krivulj; vidi se ne.

### Kje ostanejo pisave

Lastna pisava ostane **v tem brskalniku na tem računalniku**. Drug brskalnik ali drug računalnik je ne pozna, dokler je tam prav tako ne dodaš. Kdor izbriše podatke spletnih mest v brskalniku, izbriše tudi pisave. V oknu {{ui:font.title}} pisavo odstraniš iz brskalnika s košem. Tvoji načrti pri tem nič ne izgubijo, kot pokaže naslednji razdelek.

### Posredovanje načrtov z lastno pisavo

Načrt **ne shrani datoteke pisave**, ampak samo obrise črk, ki jih njegova besedila uporabljajo, tudi tiste iz prejšnjih korakov v zgodovini. Če v besedilu piše »Hallo«, potujejo zraven samo H, a, l in o. To velja za vsak način, kako je načrt shranjen: v brskalniku, na lastnem strežniku, kot datoteka `.lyl` in v {{ui:myShapes.title}}.

Iz tega sledi:

- **Načrt se povsod odpre pravilno**, tudi na računalniku brez pisave. Besedila izgledajo enako in jih lahko premikaš, vrtiš, povečuješ in zaokrožaš.
- **Nove črke potrebujejo pisavo.** Če kdo brez pisave vtipka črko, ki je načrt ni prinesel, jo layerling nariše iz Sans. Pod {{ui:prop.font}} potem piše pisava z dodatkom {{ui:font.fromDesign}}. Kdor doda datoteko pisave, spet dobi vse črke.
- **Izvozi vsebujejo samo geometrijo.** STL, 3MF, OBJ, STEP in SVG vsebujejo telesa in obrise, ne pisave.
- **Starejše različice programa layerling** lastnih pisav še ne poznajo in taka besedila narišejo v Multilanguage.

**Licence:** Pisave so zaščitene z avtorskimi pravicami in njihova licenca ureja, kaj smeš z njimi početi. Vdelani obrisi črk so isto, kar datoteke PDF vzamejo od pisave, in to večina licenc dovoljuje. Nekatere pisave, ki jih lahko kupiš, pa prepovedujejo vsako posredovanje, tudi posameznih črk. Preden načrt z lastno pisavo posreduješ ali objaviš, zato preveri licenco pisave. Proste pisave, kot so tiste iz Google Fonts (običajno pod licenco SIL Open Font License), smeš brez pomislekov posredovati. Za natisnjen del ali izvožen STL to ni pomembno: v njem ni več pisave, samo še geometrija.

## Dvignjeno ali vdolbeno

- **Dvignjeno:** Besedilo postavi na ploskev in ga združi v skupino s telesom. Zraste kot reliefen napis.
- **Vdolbeno:** Besedilo preklopi na {{ui:inspector.hole}}, pusti, da malo sega v ploskev, in ga združi v skupino s telesom. Črke so potem vgravirane.

Za napise na stranski ploskvi najprej položi delovno ravnino na to ploskev, glej [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).

## Kontura, silhueta in širše

Besedila ni treba zgraditi kot napolnjene črke. {{ui:prop.textFill}} v lastnostih ponuja isto izbiro kot Tinkercad:

- **{{ui:prop.textFill.filled}}:** črke, kot so.
- **{{ui:prop.textFill.outline}}:** črta vzdolž obrisa črk, pol znotraj in pol zunaj.
- **{{ui:prop.textFill.outer}}:** črta zunaj okoli črk.
- **{{ui:prop.textFill.inner}}:** črta znotraj v črkah.

Če je izbrana črta, se tik pod seznamom pokažeta dve nastavitvi: {{ui:prop.sketchLineWidth}} določa, kako debela je črta, {{ui:sketch.strokeJoin}}, kako teče okoli vogalov ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} ali {{ui:sketch.strokeJoin.miter}}). Redkejše nastavitve so pod {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} izpusti luknje v O, A ali e, {{ui:prop.textWider}} pa pusti črke napolnjene in jih naredi povsod debelejše za širino črte; črke, ki se pri tem dotaknejo, zrastejo v en kos.

S črto zunaj, sredinsko črto ali »Širše« raste tudi okvir besedila, črke pa obdržijo svojo velikost. {{ui:prop.bevel}} in {{ui:prop.segments}} sta samo za napolnjene črke.

## Plasti in napisi z imenom

Napis z imenom za večbarvni tisk je besedilo v plasteh: zgoraj črke, pod njimi isto besedilo malo širše v drugi barvi, čisto spodaj plošča brez lukenj v tretji. layerling to naredi z enim klikom:

- **Nov napis z imenom:** V knjižnici oblik izberi {{ui:shape.nameTag}} in ga odloži. Na njem piše »Ime« z belimi črkami na rdečem robu in temni plošči.
- **Iz besedila:** Izberi besedilo in zgoraj v njegovih nastavitvah klikni {{ui:nameTag.makeLayers}}.

Vse nastavitve napisa so v kartici {{ui:nameTag.title}}, čisto na vrhu nastavitev:

- **{{ui:prop.text}}** in **{{ui:prop.font}}**, tudi lastne pisave. Napis raste z besedami.
- **{{ui:nameTag.letterSize}}:** kako visoke so velike črke, v mm. Vse plasti gredo zraven in ostanejo prekrite.
- **{{ui:nameTag.layers}}:** ena vrstica na plast, od zgoraj navzdol. Vsaka vrstica ima barvo (klikni na barvno polje), za koliko je plast širša od črk, svojo višino in {{ui:nameTag.noHoles}}, ki zapolni luknje v črkah, kot sta O in A. {{ui:nameTag.corners}} določa, kako širša plast teče okoli vogalov črk: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} ali {{ui:nameTag.corner.miter}}. Zgornja vrstica so same črke. **+** doda plast spodaj, **–** odvzame zadnjo. Napis ima od dveh do šest plasti.
- **{{ui:nameTag.keyring}}:** da najnižji plasti raven jeziček z okroglim koncem in luknjo za obesek za ključe; jeziček raste z luknjo. Luknja 3 mm, privzeta vrednost, da 6,5 mm širok jeziček, ki sega 6,75 mm čez; rob luknje leži 2 mm od roba najnižje plasti. Izberi {{ui:nameTag.keyringDiameter}} in {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} ali {{ui:nameTag.side.top}}. Luknja gre skozi vsako plast, ki se je dotika, jeziček pa se premika zraven, če spremeniš besede, velikost črk ali pisavo.
- **{{ui:nameTag.letterEdge}}:** zaobli ali poševno odreže zgornji rob črk na vrhnji plasti, tako kot se natisnjen napis dokonča: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} ali {{ui:nameTag.edge.chamfer}}, z {{ui:nameTag.letterEdgeSize}} (sprva 0,4 mm, največ tako visoko kot plast). To gre za vsako pisavo in vsako besedo. Rob spada k mreži črk; robno orodje zato tako besedilo vzame kot mrežo, kar je pri tako fini pisavi težko - rob raje izberi tu.

Vsako spremembo vidiš takoj. Napis je sveženj: premika se kot celota, vsaka plast pa ostane svoje telo v svoji barvi, tako kot jo rezalnik potrebuje za večbarvni tisk. Da robove plasti zaobliš ali poševno odrežeš, klikni {{ui:group.editBundle}} in izberi plast, glej [Posnetje robov in izdolbljenje teles](chapter:robovi-in-izdolbljenje).

### Veliko napisov z imenom naenkrat

Imena vpiši v {{ui:textLayers.names}}, eno na vrstico, do sto. Gumb pod njim pove, koliko napisov naredi, na primer »Naredi 12 napisov z imenom«. Vsak napis dobi iste plasti, isto velikost črk in isto luknjo in je lasten objekt; ležijo v vrstah pod prvim, 5 mm narazen. Tudi preprosto besedilo ima seznam imen, nižje v svojih nastavitvah.

## Besedilo na krožnem loku

Naj napis ne teče naravnost, ampak sledi robu kovanca, pokrova ali obroča? Za to je nastavitev {{ui:prop.textCurved}}.

![Besedilo sledi krogu. Vse črke stojijo na skupni črti.](shot:curved-text)

Takoj ko jo vklopiš, besedilo teče vzdolž kroga. Vse črke stojijo na isti osnovni črti, tako enakomerno kot pri običajnem besedilu. Poleg so štiri nastavitve:

- **{{ui:prop.textRadius}}** (5 do 500 mm): Polmer kroga, na katerem teče osnovna črta črk.
- **{{ui:nameTag.letterSize}}:** Kako visoke so črke. Ne visi več na širini oblike.
- **{{ui:prop.textInward}}:** Preklopi besedilo z zgornje strani kroga na spodnjo. Črke potem kažejo z glavo proti središču.
- **{{ui:prop.textFlipped}}:** Obrne samo črke, da jih lahko bereš z druge strani. Besedilo pri tem ostane na svojem mestu na krogu.

**Središče kroga je središče oblike.** Zato poravnava deluje kot običajno: če besedilo sredinsko poravnaš z valjem ali obročem, sedi natanko koncentrično na njem. Če povlečeš za ročico, polmer in velikost pisave rasteta skupaj, tako da se pisava ne popači.

> **Namig:** Zgoraj na krogu stojijo črke zunaj osnovne črte, z {{ui:prop.textInward}} znotraj, z glavami proti središču. Da pisava ustreza plošči, naj bo polmer plus velikost pisave manjši od polmera plošče.
