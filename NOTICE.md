# Obvestilo o licenci in spremembah

**Layerling Desktop** je namizna izpeljanka programa **Layerling** (https://github.com/henmedia/layerling),
ki je sam izpeljanka programa **SketchForge-3D** (https://github.com/Formsmith746/SketchForge-3D).
Vsi trije so objavljeni pod licenco **GNU Affero General Public License v3.0 (AGPL-3.0-only)**; besedilo je v datoteki `LICENSE`.

## Kaj je spremenjeno glede na originalni program

Originalna koda se NE hrani v tem repozitoriju. Ob gradnji se prenese točno določena različica
(`upstream.json`) in nanjo se uporabi naslednje (vse je v tem repozitoriju in je javno pregledljivo):

1. `patches/apply.mjs`: pet majhnih sprememb obstoječih datotek:
   - `apps/web/next.config.ts`: izhod `standalone` za namizno gradnjo,
   - `apps/web/src/app/page.tsx`: uvoz in klic kavlja `useDesktopBridge`,
   - `apps/web/src/lib/useAppUpdate.ts`: namizni program ne sprašuje GitHuba originalnega programa po posodobitvah,
   - `apps/web/src/components/InstallAppHint.tsx`: namig za namestitev PWA se v namizni različici ne prikaže.
2. `patches/files/desktopBridge.ts`: nova datoteka (most do lupine: samodejno shranjevanje na disk, odpiranje datotek).
3. `desktop/`: lupina Electron (okno, meni, nastavitve, zagon vgrajenega strežnika, posodobitve).

## Izvorna koda

Popolna izvorna koda tega programa (lupina + popravki + natančna pripeta različica originalnega programa)
je na https://github.com/andrej-cds/layerling-desktop. V programu je povezava v meniju Pomoč → Izvorna koda.
