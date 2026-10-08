SLOVENSKA VERZIJA:

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
- Vmesnik urejevalnika je v **angleščini ali slovenščini**: slovenski prevod nadomešča nemščino (v preklopniku jezika zgoraj desno izbereš SL). Navodila (vodnik) in zgodovina novosti ostanejo v angleščini. Lupina (meniji, nastavitve, okno posodobitev, sporočila) sledi izbranemu jeziku (SL ali EN); pri prvem zagonu se uporabi jezik sistema. Prevod je v `patches/files/messages.de.ts`; besedila, ki jih proizvajalec doda pozneje, se do prevoda prikažejo v angleščini.
- Vrata **47615** morajo biti prosta. Če jih zaseda drug program, se Layerling ne more zagnati in to tudi pove. Vrata lahko spremenite v `settings.json` (ključ `port`), vendar potem projekti iz prejšnjih vrat v programu niso vidni (obnovite jih iz mape samodejnega shranjevanja).
- Brez plačljivih podpisov (Microsoft/Apple) se ob prvem zagonu pokažejo opozorila. Delovanje ni omejeno.
- Hkratnega urejanja istega projekta ni (glejte Deljenje).

## Licenca
GNU AGPL v3, kot originalni program. Glejte `LICENSE` in `NOTICE.md`.


ENGLISH VERSION:

# Layerling Desktop

A standalone application for **Windows** and **macOS** based on the 3D CAD program [Layerling](https://github.com/henmedia/layerling).
It installs like a standard application, runs without a browser or internet connection, and stores your projects as regular `.lyl` files on your disk.

This repository **does not contain** the original program's source code. During the build process, it downloads a specific version (`upstream.json`),
applies a few minor patches (`patches/`), and wraps it in an Electron shell (`desktop/`). This makes updates simple and efficient.

## Features

| | |
|---|---|
| **Automatic disk saving** | Modified projects are saved as `.lyl` files to a selected folder at set intervals (default: 30s). Older versions of each project are also preserved. The final change is saved when the window is closed. |
| **Shared folder** | Select a folder (e.g., in iCloud Drive), and a *Shared* section appears in the app; this allows you to open and save projects collaboratively with another user. |
| **AI Integration (MCP)** | Claude (or another MCP client) can build within the open editor. It works without Node.js installed. Configuration is copied from the Settings menu. |
| **Opening files** | Double-clicking a `.lyl` file opens the project in the application. |
| **Updates with confirmation** | The app automatically checks for new versions but asks for your approval before downloading or installing anything. | | **Offline use** | The program does not connect to any external addresses while running (verified by automated testing). An internet connection is required only to check for updates. |

## Installation

### Windows
1. Download `Layerling Setup <version>.exe` from the repository's **Releases** page and run it.
2. Windows may display a blue warning stating *"Windows protected your PC"* because the program is not signed with a paid certificate. Click **More info → Run anyway**.
3. The file association for `.lyl` files is set up automatically.

Without GitHub: double-click `Zgradi-Windows.cmd` in the project folder (requires Node.js 20+ and Git). The installer will be created in the `dist` folder.

### macOS
1. Download the `.dmg` file from the **Releases** page (Apple Silicon: `arm64`; older Intel Macs: without this label), open it, and drag Layerling into the *Applications* folder.
2. Open the program for the first time by **right-clicking → Open** (or via *System Settings → Privacy & Security → Open Anyway*), as it is not signed with a paid Apple certificate. It will open normally thereafter.
3. If you have downloaded the program and macOS claims it is damaged, run the following command in *Terminal*: `xattr -cr /Applications/Layerling.app`

## First launch

- Projects are automatically saved to **Documents\Layerling\Projects** (Windows: `Documents`, Mac: `Documents`). Older versions are located in **Documents\Layerling\Copies**. You can change this folder under *File → Settings*.
- Deleting a project within the program **does not delete** its copy on the disk. The folder serves as a safety net.
- If the program finds saved projects in the folder upon startup but has none loaded, it will ask if you want to restore them. You can also restore them at any time via: *File → Restore projects from auto-save*.

### Transferring projects from the browser (one-time)
Projects created in the browser are not transferred automatically (the browser stores them in its own local storage):
1. Open Layerling in your browser (the URL where you were working) → home page → **Back up all designs** (this gathers everything into a single ZIP file).
2. In Layerling Desktop, click the **Open a design or import geometry** tile and select that ZIP file. All projects will be restored.

## Sharing between users (iCloud Drive)

Configure this on **each** computer:

1. Windows: Install *iCloud for Windows*, enable *iCloud Drive*, and sign in with the same Apple ID as your daughter (or share a folder via the *Folder Sharing* feature). Mac: iCloud Drive is already enabled.
2. Create a folder named `Layerling` in iCloud Drive; the other user should accept/open it via the sharing feature.
3. In the program: *File → Settings → Shared folder → Select…* (on Windows, this is usually `C:\Users\<name>\iCloudDrive\Layerling`; on Mac, `iCloud Drive/Layerling`). If the program detects iCloud Drive, it offers a quick-selection button.
4. An **On the server** section appears on the start page. Save the project there via *Export → LYL → Save to shared*; another user can then open it from that location.

**Important:**
- **Only one person can work on the same project at a time.** This involves saving to a shared folder, not real-time collaboration. If another user modifies the project in the meantime, the program will not overwrite it but will alert you instead.
- Before opening the project, wait for iCloud to finish syncing (check the cloud icon next to the file). On a Mac, the file must be downloaded (*Download Now*).
- The automatic save function (mentioned above) should remain set to a **local** folder, not iCloud; otherwise, synchronization occurring every 30 seconds would cause conflicts.

## AI Connection (MCP)

*File → Settings → AI Connection (MCP)* displays the configuration settings. Copy this configuration into your client settings (e.g., Claude Desktop: *Settings → Developer → Edit Config*) and restart the client; keep the Layerling program running with the editor open. You can then issue commands such as: *"Create a 40×30×20 box with rounded edges in Layerling."*
