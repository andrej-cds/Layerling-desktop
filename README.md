# Layerling Desktop

Samostojen program za **Windows** in **macOS** okrog 3D-CAD programa [Layerling](https://github.com/henmedia/layerling).
Namesti se kot običajen program, deluje brez brskalnika in brez interneta, vaši projekti pa so navadne datoteke `.lyl` na disku.

Ta repozitorij **ne vsebuje** kode originalnega programa. Ob gradnji prenese točno določeno različico (`upstream.json`),
nanjo uporabi nekaj majhnih popravkov (`patches/`) in jo zapakira v lupino Electron (`desktop/`). Zato je posodabljanje preprosto in poceni.

## Kaj program zna

| | |
|---|---|
| **Samodejno shranjevanje na disk** | Na nastavljen interval (privzeto 30 s) se spremenjeni projekti zapišejo kot `.lyl` v izbrano mapo. Ohrani se tudi nekaj starejših verzij vsakega projekta. Ob zaprtju okna se zapiše še zadnja sprememba. |
| **Skupna mapa** | Izberete mapo (npr. v iCloud Drive) in v programu se pojavi razdelek *Shared*: tam odpirate in shranjujete projekte skupaj z drugim uporabnikom. |
| **Povezava z AI (MCP)** | Claude (ali drug odjemalec MCP) lahko gradi v odprtem urejevalniku. Deluje brez nameščenega Node.js. Nastavitev se kopira iz Nastavitev. |
| **Odpiranje datotek** | Dvojni klik na `.lyl` odpre projekt v programu. |
| **Posodobitve s potrditvijo** | Program sam preveri, ali je izšla nova različica, vprašal pa vas bo, preden karkoli prenese ali namesti. |
| **Brez interneta** | Med delom program ne kliče nobenega zunanjega naslova (preverja avtomatski preizkus). Internet je potreben samo za preverjanje posodobitev. |

## Namestitev

### Windows
1. Na strani **Releases** repozitorija prenesite `Layerling Setup <različica>.exe` in ga zaženite.
2. Windows lahko pokaže modro opozorilo *"Windows je zaščitil vaš računalnik"*, ker program ni podpisan s plačljivim potrdilom. Kliknite **Več informacij → Vseeno zaženi**.
3. Povezava s privzetim programom za `.lyl` se nastavi sama.

Brez GitHuba: v mapi projekta dvokliknite `Zgradi-Windows.cmd` (potrebna sta Node.js 20+ in Git). Namestitveni program nastane v mapi `dist`.

### macOS
1. Na strani **Releases** prenesite `.dmg` (Apple Silicon: `arm64`, starejši Mac z Intelom: brez te oznake), ga odprite in povlecite Layerling v *Programi*.
2. Prvič program odprite z **desnim klikom → Odpri** (ali *Sistemske nastavitve → Zasebnost in varnost → Vseeno odpri*), ker ni podpisan z Applovim plačljivim potrdilom. Naslednjič se odpre običajno.
3. Če je program prenesen in macOS trdi, da je poškodovan, v *Terminalu* zaženite: `xattr -cr /Applications/Layerling.app`

## Prvi zagon

- Projekti se samodejno zapisujejo v **Dokumenti\Layerling\Projekti** (Windows: `Dokumenti`, Mac: `Dokumenti`). Starejše verzije so v **Dokumenti\Layerling\Kopije**. Mapo spremenite v *Datoteka → Nastavitve*.
- Brisanje projekta v programu **ne izbriše** njegove kopije na disku. Mapa je varnostna mreža.
- Če program ob zagonu nima projektov, v mapi pa najde shranjene, vpraša, ali jih obnoviti. Obnovite jih lahko tudi kadarkoli: *Datoteka → Obnovi projekte iz samodejnega shranjevanja*.

### Prenos projektov iz brskalnika (enkrat)
Projekti, ki ste jih naredili v brskalniku, se ne prenesejo sami (brskalnik jih hrani v svoji shrambi):
1. V brskalniku odprite Layerling (tisti naslov, kjer ste delali) → začetna stran → **Back up all designs** (zbere vse v en ZIP).
2. V Layerling Desktop kliknite ploščico **Open a design or import geometry** in izberite ta ZIP. Vsi projekti se vrnejo.

## Deljenje med uporabnikoma (iCloud Drive)

Nastavite na **vsakem** računalniku:

1. Windows: namestite *iCloud za Windows*, vklopite *iCloud Drive* in se prijavite z istim Apple ID-jem kot hči (ali delita skupno mapo prek *Deljenje mape*). Mac: iCloud Drive je že vklopljen.
2. V iCloud Drive ustvarite mapo `Layerling`, drugi uporabnik naj jo sprejme/odpre prek skupne rabe.
3. V programu: *Datoteka → Nastavitve → Skupna mapa → Izberi …* (na Windows običajno `C:\Users\<ime>\iCloudDrive\Layerling`, na Macu `iCloud Drive/Layerling`). Če program najde iCloud Drive, ponudi gumb za hitro izbiro.
4. Na začetni strani se pojavi razdelek **On the server**. Projekt shranite vanj prek *Export → LYL → Save to shared*, drugi ga tam odpre.

**Pomembno:**
- **Hkrati lahko na istem projektu dela samo ena oseba.** To je shranjevanje v skupno mapo, ne sodelovanje v živo. Če je projekt vmes spremenil drug, ga program ne bo prepisal, ampak vas opozori.
- Pred odpiranjem počakajte, da iCloud dokonča sinhronizacijo (oblaček ob datoteki). Na Macu mora biti datoteka prenesena (*Download Now*).
- Samodejno shranjevanje (zgoraj) naj ostane v **lokalni** mapi, ne v iCloudu, sicer bi sinhronizacija vsakih 30 s povzročala konflikte.

## Povezava z AI (MCP)

*Datoteka → Nastavitve → Povezava z AI (MCP)* pokaže nastavitev. Kopirajte jo v nastavitve odjemalca (Claude Desktop: *Settings → Developer → Edit Config*), ga znova zaženite, program Layerling pa naj bo odprt z odprtim urejevalnikom. Nato lahko rečete npr. *"V Layerlingu naredi škatlo 40×30×20 z zaobljenimi robovi."*
Žeton je skrit v tej nastavitvi; povezava deluje samo s tega računalnika. Gumb *Ustvari nov žeton* stari žeton razveljavi.

## Posodobitve

Dve ločeni stvari:

1. **Posodobitev vašega programa** (to vidite vi): ob zagonu (in prek *Pomoč → Preveri posodobitve*) program pogleda, ali je na GitHubu nova izdaja. Če je, vpraša: *Prenesi in namesti / Pozneje*. Na Windows se po potrditvi sama namesti. Na Macu program samo odpre stran za prenos (brez Applovega podpisa samodejna namestitev ni mogoča).
2. **Novosti originalnega programa** (vzdrževanje): enkrat tedensko GitHub preveri, ali je proizvajalec izdal novo različico, in če je, odpre *Issue* (e-pošta vam pride sama). Novo različico nato vključite po postopku spodaj.

## Za vzdrževalca

### Mape
```
desktop/     lupina Electron (okno, meni, nastavitve, strežnik, posodobitve, zrcaljenje na disk)
patches/     popravki originalnega programa (apply.mjs) + nove datoteke (files/)
scripts/     gradnja spletnega dela, prenos/posodobitev originalne kode, pomožni koraki pakiranja
test/        enotni testi lupine            (npm test)
test-e2e/    celoten preizkus v pravem Electronu (npm run test:e2e)
upstream.json  pripeta različica originalnega programa
```

### Ukazi
| | |
|---|---|
| `npm install` | namesti odvisnosti lupine |
| `npm run build:web` | prenese pripeto različico, uporabi popravke, zgradi spletni del v `web-dist/` |
| `npm start` | zažene program iz izvorne kode (po `build:web`) |
| `npm test` | enotni testi |
| `npm run test:e2e` | celoten preizkus (na Linuxu brez zaslona: `xvfb-run -a node test-e2e/e2e.mjs`, z `LAYERLING_E2E_SOFTGL=1`; za zapakiran program `E2E_EXECUTABLE=pot/do/programa`) |
| `npm run dist:win` / `dist:mac` | zgradi namestitveni program (v mapo `dist/`) |
| `npm run update:upstream` | pripne najnovejšo različico originalnega programa in jo preizkusi |

### Izdaja nove različice (za vaju z družino)
1. (Po potrebi) `npm run update:upstream`: pripne novo osnovo. Postopek uporabi popravke, požene preverjanje tipov in **vse teste proizvajalca**, zgradi program in se ob napaki vrne na staro različico.
2. `npm start`: hiter ročni pregled.
3. `git commit -am "Posodobitev osnove na vX.Y.Z"` → `git push`
4. `git tag v1.0.1` → `git push origin v1.0.1`. GitHub Actions zgradi Windows in Mac in ju objavi pod *Releases*. Programi, ki jih imate nameščene, jo ob naslednjem preverjanju ponudijo.

Številka različice programa (`v1.0.1`) je **neodvisna** od številke originalnega programa; ta je zapisana v *O programu*.

### Če popravki ne pristanejo
`patches/apply.mjs` se veže na besedilna sidra, ne na številke vrstic. Če jih proizvajalec spremeni, skripta glasno odpove in pove, katero datoteko je treba pogledati (sporočilo *"sidro … najdeno 0-krat"*). Takrat popravek v `apply.mjs` uskladite z novo kodo; popravki so le štirje.

### Prva namestitev na GitHub
1. Na github.com/andrej-cds ustvarite **javen** repozitorij z imenom `layerling-desktop` (javen je potreben za samodejne posodobitve in za AGPL).
2. V mapi projekta: `git init`, `git add .`, `git commit -m "Prvi vnos"`, `git branch -M main`, `git remote add origin https://github.com/andrej-cds/layerling-desktop.git`, `git push -u origin main`
3. Na GitHubu: *Settings → Actions → General → Workflow permissions → Read and write permissions → Save*.
4. `git tag v1.0.0`, `git push origin v1.0.0`

## Znane omejitve
- Vmesnik urejevalnika je v **angleščini ali slovenščini**: slovenski prevod nadomešča nemščino (v preklopniku jezika zgoraj desno izbereš SL). Navodila (vodnik) in zgodovina novosti ostanejo v angleščini. Lupina (meni, nastavitve, sporočila) je v slovenščini. Prevod je v `patches/files/messages.de.ts`; besedila, ki jih proizvajalec doda pozneje, se do prevoda prikažejo v angleščini.
- Vrata **47615** morajo biti prosta. Če jih zaseda drug program, se Layerling ne more zagnati in to tudi pove. Vrata lahko spremenite v `settings.json` (ključ `port`), vendar potem projekti iz prejšnjih vrat v programu niso vidni (obnovite jih iz mape samodejnega shranjevanja).
- Brez plačljivih podpisov (Microsoft/Apple) se ob prvem zagonu pokažejo opozorila. Delovanje ni omejeno.
- Hkratnega urejanja istega projekta ni (glejte Deljenje).

## Licenca
GNU AGPL v3, kot originalni program. Glejte `LICENSE` in `NOTICE.md`.
