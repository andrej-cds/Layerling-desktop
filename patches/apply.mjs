// Popravki originalnega programa za namizno različico.
//
// Namenoma so majhni in se vežejo na besedilna sidra, ne na številke vrstic, zato preživijo večino
// posodobitev. Če sidra ni več (ali je dvoumno), skripta glasno odpove in pove, katero datoteko je treba pogledati.
//
// Uporaba: node patches/apply.mjs <pot do mape z originalno kodo>
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));

// Neobvezna lokalna razširitev (patches/local/apply-local.mjs). Če je ni, se ne zgodi nič.
const localFile = join(here, "local", "apply-local.mjs");
const local = existsSync(localFile) ? await import(pathToFileURL(localFile).href) : null;

/** Besedila za izbiro »Imena gumbov« v vseh jezikih (vsak katalog mora imeti vse ključe): naslov, samo ikone, ikone in imena, samo imena. */
const TOOL_LABEL_TEXTS = {
  en: ["Button names", "Icons only", "Icons and names", "Names only"],
  sl: ["Imena gumbov", "Samo ikone", "Ikone in imena", "Samo imena"],
  ar: ["أسماء الأزرار", "الأيقونات فقط", "الأيقونات والأسماء", "الأسماء فقط"],
  cs: ["Názvy tlačítek", "Jen ikony", "Ikony a názvy", "Jen názvy"],
  da: ["Knapnavne", "Kun ikoner", "Ikoner og navne", "Kun navne"],
  de: ["Schaltflächennamen", "Nur Symbole", "Symbole und Namen", "Nur Namen"],
  es: ["Nombres de los botones", "Solo iconos", "Iconos y nombres", "Solo nombres"],
  fr: ["Noms des boutons", "Icônes seules", "Icônes et noms", "Noms seuls"],
  hu: ["Gombnevek", "Csak ikonok", "Ikonok és nevek", "Csak nevek"],
  it: ["Nomi dei pulsanti", "Solo icone", "Icone e nomi", "Solo nomi"],
  ja: ["ボタン名", "アイコンのみ", "アイコンと名前", "名前のみ"],
  nl: ["Knopnamen", "Alleen pictogrammen", "Pictogrammen en namen", "Alleen namen"],
  pl: ["Nazwy przycisków", "Tylko ikony", "Ikony i nazwy", "Tylko nazwy"],
  "pt-br": ["Nomes dos botões", "Somente ícones", "Ícones e nomes", "Somente nomes"],
  ru: ["Названия кнопок", "Только значки", "Значки и названия", "Только названия"],
  tr: ["Düğme adları", "Yalnızca simgeler", "Simgeler ve adlar", "Yalnızca adlar"],
  "zh-cn": ["按钮名称", "仅图标", "图标和名称", "仅名称"],
  "zh-tw": ["按鈕名稱", "僅圖示", "圖示與名稱", "僅名稱"],
};

/** Vsak popravek: v `file` zamenja natanko eno pojavitev `find` z `replace`. `marker` pove, da je že uporabljen. */
export const edits = [
  {
    name: "Next: izhod standalone za namizno gradnjo",
    file: "apps/web/next.config.ts",
    marker: 'LAYERLING_DESKTOP === "true"',
    find: "  ...(isStaticExport\n    ? {",
    replace: '  ...(process.env.LAYERLING_DESKTOP === "true" && !isStaticExport ? { output: "standalone" as const } : {}),\n  ...(isStaticExport\n    ? {',
  },
  {
    name: "Izvoz STEP: navadna skupina se združi v eno telo z imenom skupine (rob za Chamfer v Fusionu)",
    file: "apps/web/src/lib/stepExport.ts",
    marker: "CDS: group fused",
    find: "      parts.push(...await buildScope(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped));\n      continue;",
    replace: `      // CDS: group fused - the group is one body in the editor, so it is one body in the file too.
      const inner = await buildScope(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped);
      if (inner.length > 1) {
        const fused = brep.fuseAll(inner.map((part) => part.solid) as Parameters<Brep["fuseAll"]>[0]);
        if (fused.ok) {
          const box: Aabb = {
            min: [0, 1, 2].map((i) => Math.min(...inner.map((part) => part.box.min[i]))) as Aabb["min"],
            max: [0, 1, 2].map((i) => Math.max(...inner.map((part) => part.box.max[i]))) as Aabb["max"],
          };
          parts.push({ solid: fused.value as BrepSolid, box, name: shape.name, kind: inner[0].kind, color: inner[0].color });
          continue;
        }
        skipped.push({ name: shape.name, kind: shape.kind, reason: "the group's parts could not be fused; exported separately", code: "failed" });
      }
      parts.push(...inner);
      continue;`,
  },
  {
    name: "Preizkusi: daljši čas za posamezen test (počasen strežnik za gradnjo)",
    file: "tests/vitest.config.ts",
    marker: "testTimeout",
    find: '    include: ["tests/unit/**/*.test.ts"],\n',
    replace: '    include: ["tests/unit/**/*.test.ts"],\n    testTimeout: 30000,\n',
  },
  {
    name: "Sličice projektov: mapa v uporabniških podatkih (preživi posodobitev)",
    file: "apps/web/src/app/api/project-thumbnail/route.ts",
    marker: "LAYERLING_THUMBNAIL_DIR",
    find: 'const THUMBNAIL_DIR = path.join(process.cwd(), ".codex", "project-thumbnails");',
    replace: 'const THUMBNAIL_DIR = process.env.LAYERLING_THUMBNAIL_DIR || path.join(process.cwd(), ".codex", "project-thumbnails");',
  },
  {
    name: "Nadzorna plošča: uvoz mostu",
    file: "apps/web/src/app/page.tsx",
    marker: 'from "@/lib/desktopBridge"',
    find: 'zipHoldsDesigns } from "@/lib/projectBackup";',
    replace:
      'zipHoldsDesigns } from "@/lib/projectBackup";\nimport { useDesktopBridge } from "@/lib/desktopBridge";',
  },
  {
    name: "Nadzorna plošča: kavelj mostu",
    file: "apps/web/src/app/page.tsx",
    marker: "useDesktopBridge({",
    find: "  const openLatestProject = () => {",
    replace:
      "  // Namizna različica: samodejno shranjevanje na disk in odpiranje datotek iz lupine (v brskalniku brez učinka).\n  useDesktopBridge({ projects, getBytes: projectPackageBytes, openFiles: importFilesFromDashboard, onDownloadCancelled: () => setDashboardNotice(\"\") });\n\n  const openLatestProject = () => {",
  },
  {
    name: "Nadzorna plošča: pasica o shranjevanju v brskalniku ne spada v namizni program (oznaka)",
    file: "apps/web/src/app/page.tsx",
    marker: "layerling-desktop-shell",
    find: "  const openLatestProject = () => {",
    replace:
      '  // Namizni program ne hrani načrtov v brskalniku: pasica o shranjevanju v brskalniku bi zavajala (skrije jo CSS).\n  useEffect(() => {\n    if ((window as unknown as { layerlingDesktop?: unknown }).layerlingDesktop) document.documentElement.classList.add("layerling-desktop-shell");\n  }, []);\n\n  const openLatestProject = () => {',
  },
  {
    name: "Nadzorna plošča: pasica o shranjevanju v brskalniku ne spada v namizni program (slog)",
    file: "apps/web/src/app/globals.css",
    marker: "layerling-desktop-shell",
    find: "\n.storage-notice {\n",
    replace:
      "\n.layerling-desktop-shell .storage-notice {\n  display: none !important;\n}\n\n/* Urejevalnik v namizni različici: besedila na strani se ne da po nesreči označiti (vlečenje prek spodnje vrstice, Ctrl+A). Polja za vnos ostanejo običajna. */\n.layerling-desktop-shell .layerling-editor,\n.layerling-desktop-shell .editor-legal {\n  -webkit-user-select: none;\n  user-select: none;\n}\n\n.layerling-desktop-shell .layerling-editor :is(input, textarea, [contenteditable=\"true\"]) {\n  -webkit-user-select: text;\n  user-select: text;\n}\n\n.storage-notice {\n",
  },
  {
    name: "Posodobitve: namizni program jih ureja sam",
    file: "apps/web/src/lib/useAppUpdate.ts",
    marker: "layerlingDesktop",
    find: '  return typeof window === "undefined" || !PUBLISHED_HOSTS.has(window.location.hostname.toLowerCase());',
    replace:
      '  // Namizna različica se posodablja prek lastnega mehanizma lupine, ne prek GitHuba originalnega programa.\n  if (typeof window !== "undefined" && (window as unknown as { layerlingDesktop?: unknown }).layerlingDesktop) return false;\n  return typeof window === "undefined" || !PUBLISHED_HOSTS.has(window.location.hostname.toLowerCase());',
  },
  {
    name: "Namig za namestitev PWA: v namizni različici ni smiseln",
    file: "apps/web/src/components/InstallAppHint.tsx",
    marker: "layerlingDesktop",
    find: '    if (!offlineAvailable()) return;\n    if (runsAsInstalledApp()) {',
    replace:
      '    if ((window as unknown as { layerlingDesktop?: unknown }).layerlingDesktop) return;\n    if (!offlineAvailable()) return;\n    if (runsAsInstalledApp()) {',
  },
  {
    name: "Desktop: različica lupine v nogi",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "DesktopVersion",
    find: '{t("dashboard.releaseNotes", { version })}\n          </a>,',
    replace: '{t("dashboard.releaseNotes", { version })}\n          </a>,\n          <DesktopVersion key="desktop-version" />,',
  },
  {
    name: "Desktop: uvoz komponente z različico lupine",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: 'from "@/components/DesktopVersion"',
    find: 'import { SupportNudge } from "@/components/SupportNudge";',
    replace: 'import { SupportNudge } from "@/components/SupportNudge";\nimport { DesktopVersion } from "@/components/DesktopVersion";',
  },
  {
    name: "Spletni izvoz v podmapi (npr. /layerling)",
    stage: "podmapa",
    file: "apps/web/next.config.ts",
    marker: "LAYERLING_BASE_PATH",
    find: "        trailingSlash: true,\n",
    replace: '        trailingSlash: true,\n        ...(process.env.LAYERLING_BASE_PATH ? { basePath: process.env.LAYERLING_BASE_PATH, assetPrefix: process.env.LAYERLING_BASE_PATH } : {}),\n',
  },
  {
    name: "Podmapa: jedro OCCT (zaokrožitve, posnetki, skice) se naloži iz podmape",
    stage: "podmapa",
    file: "apps/web/src/lib/cadModifierRuntime.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE",
    find: 'export const CAD_MODIFIER_RUNTIME_BASE = occtRuntimeVersion ? `/occt/${occtRuntimeVersion}` : "/occt";',
    replace: 'export const CAD_MODIFIER_RUNTIME_BASE = `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? ""}${occtRuntimeVersion ? `/occt/${occtRuntimeVersion}` : "/occt"}`;',
  },
  {
    name: "Podmapa: japonske pisave iz podmape",
    stage: "podmapa",
    file: "apps/web/src/lib/textFonts.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE",
    find: "await fetch(`/fonts/japanese/",
    replace: "await fetch(`${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/fonts/japanese/",
  },
  {
    name: "Podmapa: drugi pogled iz podmape",
    stage: "podmapa",
    file: "apps/web/src/components/workplane/SecondViewWindow.tsx",
    marker: "NEXT_PUBLIC_LAYERLING_BASE",
    find: 'const VIEW_PAGE = "/view.html";',
    replace: 'const VIEW_PAGE = `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? ""}/view.html`;',
  },
  {
    name: "Podmapa: storitveni delavec (brez povezave) se registrira v podmapi",
    stage: "podmapa",
    file: "apps/web/src/components/ServiceWorkerRegistration.tsx",
    marker: "NEXT_PUBLIC_LAYERLING_BASE",
    find: 'navigator.serviceWorker.register("/sw.js", { scope: "/" })',
    replace: 'navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? ""}/sw.js`, { scope: `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? ""}/` })',
  },
  {
    name: "Podmapa: obvestilo o novi različici bere version.json iz podmape",
    stage: "podmapa",
    file: "apps/web/src/lib/newVersionWatch.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE",
    find: 'export const VERSION_FILE = "/version.json";',
    replace: 'export const VERSION_FILE = `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? ""}/version.json`;',
  },
  {
    name: "Podmapa: povezave na poglavja navodil",
    stage: "podmapa",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${directory}/${chapterSlug}",
    find: "  return `/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : \"\"}`;",
    replace: "  return `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : \"\"}`;",
  },
  {
    name: "Podmapa: iskalni indeks navodil (interaktivna pomoč)",
    stage: "podmapa",
    file: "apps/web/src/lib/guideHelp.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${(LANGUAGE_INFO",
    find: "  return `/${(LANGUAGE_INFO[language] ?? LANGUAGE_INFO.en).guideDir}/search-index.json`;",
    replace: "  return `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${(LANGUAGE_INFO[language] ?? LANGUAGE_INFO.en).guideDir}/search-index.json`;",
  },
  {
    name: "Podmapa: ikone oblik v meniju (CSS spremenljivka)",
    stage: "podmapa",
    file: "apps/web/src/components/workplane/SecondaryToolbar.tsx",
    marker: "--shape-icon\": `url(${process.env.NEXT_PUBLIC_LAYERLING_BASE",
    find: "\"--shape-icon\": `url(/${shape.menuIcon.replace(/^\\/+/, \"\")})`",
    replace: "\"--shape-icon\": `url(${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${shape.menuIcon.replace(/^\\/+/, \"\")})`",
  },
  {
    name: "Podmapa: brez klica na api.github.com (zasebnost obiskovalcev spletne različice)",
    stage: "podmapa",
    file: "apps/web/src/lib/appUpdate.ts",
    marker: "NEXT_PUBLIC_LAYERLING_BASE) return null",
    find: "export function githubReleasesLatestApiUrl(sourceCodeUrl: string = SOURCE_CODE_URL): string | null {\n  try {",
    replace: "export function githubReleasesLatestApiUrl(sourceCodeUrl: string = SOURCE_CODE_URL): string | null {\n  if (process.env.NEXT_PUBLIC_LAYERLING_BASE) return null;\n  try {",
  },
  {
    name: "Podmapa: URL ostane v podmapi (1)",
    stage: "podmapa",
    file: "apps/web/src/app/page.tsx",
    marker: "replaceState(null, \"\", window.location.pathname);\n    }\n  }, [activeProjectId",
    find: "      window.history.replaceState(null, \"\", \"/\");\n    }\n  }, [activeProjectId, projects]);",
    replace: "      window.history.replaceState(null, \"\", window.location.pathname);\n    }\n  }, [activeProjectId, projects]);",
  },
  {
    name: "Podmapa: URL ostane v podmapi (2)",
    stage: "podmapa",
    file: "apps/web/src/app/page.tsx",
    marker: "window.location.pathname);\n        return;",
    find: "        setView(\"dashboard\");\n        window.history.replaceState(null, \"\", \"/\");\n        return;",
    replace: "        setView(\"dashboard\");\n        window.history.replaceState(null, \"\", window.location.pathname);\n        return;",
  },
  {
    name: "Podmapa: URL ostane v podmapi (3)",
    stage: "podmapa",
    file: "apps/web/src/app/page.tsx",
    marker: "`${window.location.pathname}?editor=1`",
    find: "      const nextUrl = projectId ? `/?editor=1&project=${encodeURIComponent(projectId)}` : \"/?editor=1\";",
    replace: "      const nextUrl = projectId ? `${window.location.pathname}?editor=1&project=${encodeURIComponent(projectId)}` : `${window.location.pathname}?editor=1`;",
  },
  {
    name: "Podmapa: URL ostane v podmapi (4)",
    stage: "podmapa",
    file: "apps/web/src/app/page.tsx",
    marker: "window.location.pathname);\n    }\n  };",
    find: "    setView(\"dashboard\");\n    if (typeof window !== \"undefined\") {\n      window.history.replaceState(null, \"\", \"/\");\n    }\n  };",
    replace: "    setView(\"dashboard\");\n    if (typeof window !== \"undefined\") {\n      window.history.replaceState(null, \"\", window.location.pathname);\n    }\n  };",
  },
  {
    name: "Pogled: gumb za vrtenje je vedno viden",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "camera-touch-rotate-vedno",
    find: "            {touchDevice ? (\n              <button\n                className={`camera-touch-rotate${touchRotate ? \" active\" : \"\"}`}",
    replace: "            {/* camera-touch-rotate-vedno: v namizni različici (tudi prek oddaljenega zaslona z iPada) mora biti gumb viden vedno */}\n            {true ? (\n              <button\n                className={`camera-touch-rotate${touchRotate ? \" active\" : \"\"}`}",
  },
  {
    name: "Pogled: preklopnik vrtenja da zastavico tudi miški",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "__lylMouseRotate = touchRotate",
    find: "    touchRotateRef.current = touchRotate;\n  }, [touchRotate]);",
    replace: "    touchRotateRef.current = touchRotate;\n    (window as unknown as { __lylMouseRotate?: boolean }).__lylMouseRotate = touchRotate;\n  }, [touchRotate]);",
  },
  {
    name: "Pogled: leva tipka miške vrti, ko je preklopnik vklopljen (kamera)",
    stage: "jezik",
    file: "apps/web/src/components/workplane/viewportScene.ts",
    marker: "mouseRotateOn",
    find: "    if (event.pointerType !== \"touch\" && (event.button === 1 || event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {\n      cameraPointers.set(event.pointerId, event);\n    }\n    // Ctrl or Cmd with the left button moves the view (#654), see leftButtonCameraAction.\n    controls.mouseButtons.LEFT = leftButtonCameraAction(event);",
    replace: "    const mouseRotateOn = event.pointerType !== \"touch\" && event.button === 0 && !event.ctrlKey && !event.metaKey && (window as unknown as { __lylMouseRotate?: boolean }).__lylMouseRotate === true;\n    if (event.pointerType !== \"touch\" && (event.button === 1 || event.button === 2 || mouseRotateOn || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {\n      cameraPointers.set(event.pointerId, event);\n    }\n    // Ctrl or Cmd with the left button moves the view (#654), see leftButtonCameraAction.\n    controls.mouseButtons.LEFT = mouseRotateOn ? THREE.MOUSE.ROTATE : leftButtonCameraAction(event);",
  },
  {
    name: "Pogled: leva tipka miške ne izbira, ko vrti",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "touchRotateRef.current && !event.ctrlKey",
    find: "      // The right button turns the view; only a press that is let go where it\n      // started opens the menu (finishDrag).",
    replace: "      if (event.pointerType !== \"touch\" && event.button === 0 && touchRotateRef.current && !event.ctrlKey && !event.metaKey) {\n        return;\n      }\n      // The right button turns the view; only a press that is let go where it\n      // started opens the menu (finishDrag).",
  },
  {
    name: "Slovenščina: prva v seznamu jezikov",
    stage: "jezik",
    file: "apps/web/src/components/LanguageSwitch.tsx",
    marker: 'a === "sl" ? -1',
    find: "          {LANGUAGES.map((option) => {",
    replace: '          {[...LANGUAGES].sort((a, b) => (a === "sl" ? -1 : b === "sl" ? 1 : 0)).map((option) => {',
  },
  {
    name: "Pisave: uvoz nalagalnika lastnih pisav",
    stage: "jezik",
    file: "apps/web/src/lib/textFonts.ts",
    marker: "from \"@/lib/userFonts\"",
    find: "import { FontLoader, type Font, type FontData } from \"three/examples/jsm/loaders/FontLoader.js\";",
    replace: "import { FontLoader, type Font, type FontData } from \"three/examples/jsm/loaders/FontLoader.js\";\nimport { readUserFontData } from \"@/lib/userFonts\";",
  },
  {
    name: "Pisave: nalaganje lastnih pisav po vgrajenih",
    stage: "jezik",
    file: "apps/web/src/lib/textFonts.ts",
    marker: "loadUserTextFonts",
    find: "export function loadTextFonts(): Promise<void> {\n  if (loadedFonts) return Promise.resolve();",
    replace: "const BUILT_IN_FONT_NAMES = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\", \"Japanese\"];\nlet userFontNames: string[] = [];\nlet userFontsPromise: Promise<void> | null = null;\n\n/** Vse pisave za seznam: vgrajene in lastne iz mape s pisavami (namizna različica). */\nexport function textFontNames(): string[] {\n  return [...BUILT_IN_FONT_NAMES, ...userFontNames];\n}\n\nasync function loadUserTextFonts(): Promise<void> {\n  const extra = await readUserFontData();\n  if (!loadedFonts || extra.length === 0) return;\n  const sans = loadedFonts.Sans?.data as FontData | undefined;\n  const loader = new FontLoader();\n  for (const [name, data] of extra) {\n    if (BUILT_IN_FONT_NAMES.includes(name) || userFontNames.includes(name)) continue;\n    // Manjkajoče črke (npr. č, š, ž) si pisava izposodi iz pisave Sans.\n    loadedFonts[name] = loader.parse(sans ? withFallbackGlyphs(data, sans) : data);\n    userFontNames.push(name);\n  }\n}\n\nexport function loadTextFonts(): Promise<void> {\n  return loadBuiltInTextFonts().then(() => (userFontsPromise ??= loadUserTextFonts().catch(() => undefined)));\n}\n\nfunction loadBuiltInTextFonts(): Promise<void> {\n  if (loadedFonts) return Promise.resolve();",
  },
  {
    name: "Pisave: seznam v urejevalniku lastnosti",
    stage: "jezik",
    file: "apps/web/src/components/workplane/ShapeInspector.tsx",
    marker: "textFontNames().map",
    find: "TEXT_FONT_OPTIONS.map((value)",
    replace: "textFontNames().map((value)",
  },
  {
    name: "Pisave: uvoz seznama v urejevalniku lastnosti",
    stage: "jezik",
    file: "apps/web/src/components/workplane/ShapeInspector.tsx",
    marker: "import { textFontNames }",
    find: "import { GuideHelpLink } from \"@/components/GuideHelpLink\";",
    replace: "import { GuideHelpLink } from \"@/components/GuideHelpLink\";\nimport { textFontNames } from \"@/lib/textFonts\";",
  },
  {
    name: "Pisave: odstrani stari seznam (urejevalnik lastnosti)",
    stage: "jezik",
    file: "apps/web/src/components/workplane/ShapeInspector.tsx",
    marker: "// seznam pisav je v textFonts",
    find: "const TEXT_FONT_OPTIONS = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\", \"Japanese\"];",
    replace: "// seznam pisav je v textFonts",
  },
  {
    name: "Pisave: seznam v nastavitvah delovne ravnine",
    stage: "jezik",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "textFontNames().map",
    find: "TEXT_FONT_OPTIONS.map((value)",
    replace: "textFontNames().map((value)",
  },
  {
    name: "Pisave: uvoz seznama v nastavitvah",
    stage: "jezik",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "import { textFontNames }",
    find: "import { GuideHelpLink } from \"@/components/GuideHelpLink\";",
    replace: "import { GuideHelpLink } from \"@/components/GuideHelpLink\";\nimport { textFontNames } from \"@/lib/textFonts\";",
  },
  {
    name: "Pisave: odstrani stari seznam (nastavitve)",
    stage: "jezik",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "// seznam pisav je v textFonts",
    find: "const TEXT_FONT_OPTIONS = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\", \"Japanese\"];",
    replace: "// seznam pisav je v textFonts",
  },
  {
    name: "Pisave: privzeta pisava sprejme tudi lastne",
    stage: "jezik",
    file: "apps/web/src/lib/workplaneSettings.ts",
    marker: "source.font.length <= 80",
    find: "[\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\"].includes(source.font)",
    replace: "(typeof source.font === \"string\" && source.font.length > 0 && source.font.length <= 80)",
  },
  {
    name: "Slovenščina: jezikovni namig za napake",
    stage: "jezik",
    file: "apps/web/src/lib/userErrors.ts",
    marker: "čšž]/i",
    find: "|[äöüß]/i;",
    replace: "|\\b(ni|je|se|za|ali|ter|pri|iz|ne|datoteke|projekta)\\b|[äöüßčšž]/i;",
  },
  {
    name: "Slovenščina: naslov strani brez »in your browser«",
    stage: "jezik",
    file: "apps/web/src/app/layout.tsx",
    marker: 'const TITLE = "layerling - Free 3D CAD for 3D printing";',
    find: 'const TITLE = "layerling - Free 3D CAD for 3D printing in your browser";',
    replace: 'const TITLE = "layerling - Free 3D CAD for 3D printing";',
  },
  {
    name: "Slovenščina: skriti naslov brez »in your browser«",
    stage: "jezik",
    file: "apps/web/src/app/page.tsx",
    marker: "<h1>layerling - Free 3D CAD for 3D printing</h1>",
    find: "<h1>layerling - Free 3D CAD for 3D printing in your browser</h1>",
    replace: "<h1>layerling - Free 3D CAD for 3D printing</h1>",
  },
  {
    name: "CDS: znak ob logotipu na nadzorni plošči",
    stage: "jezik",
    file: "apps/web/src/app/page.tsx",
    marker: "cds-badge-dashboard",
    find: '            <span className="dashboard-tagline">{t("brand.tagline")}</span>\n          </span>\n        </a>',
    replace:
      '            <span className="dashboard-tagline">{t("brand.tagline")}</span>\n          </span>\n          <span className="cds-badge-dashboard" title="Layerling Desktop · Cassette Deck Service" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 10, paddingLeft: 14, borderLeft: "1px solid rgba(120,100,70,0.35)", fontSize: 10.5, fontWeight: 600, lineHeight: 1.2, opacity: 0.9 }}>\n            <img src="/assets/cds/cds-round.png" alt="CDS" width={30} height={30} style={{ display: "block", borderRadius: "50%" }} />\n            <span>Desktop by<br />Cassette Deck Service</span>\n          </span>\n        </a>',
  },
  {
    name: "CDS: znak ob logotipu v urejevalniku",
    stage: "jezik",
    file: "apps/web/src/components/workplane/SecondaryToolbar.tsx",
    marker: "cds-badge-editor",
    find: '            <span className="toolbar-brand-tagline">{t("brand.tagline")}</span>\n          </span>\n        </div>',
    replace:
      '            <span className="toolbar-brand-tagline">{t("brand.tagline")}</span>\n          </span>\n          <img className="cds-badge-editor" src="/assets/cds/cds-round.png" alt="Cassette Deck Service" title="Layerling Desktop · Cassette Deck Service" width={26} height={26} style={{ borderRadius: "50%", marginLeft: 4 }} />\n        </div>',
  },
  {
    name: "Podmapa: povezava na pregled navodil",
    stage: "jezik",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: "${process.env.NEXT_PUBLIC_LAYERLING_BASE",
    find: "  if (!page) return `/${directory}/index.html`;",
    replace: "  if (!page) return `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/${directory}/index.html`;",
  },
  {
    name: "Podpora: povezava na slovensko stran namizne različice",
    stage: "jezik",
    file: "apps/web/src/lib/supportLink.ts",
    marker: "/podpri/index.html",
    find: "return { href: `${DEFAULT_SUPPORT_URL}?lang=${language}`, label };",
    replace: "void language;\n  void DEFAULT_SUPPORT_URL;\n  return { href: `${process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\"}/podpri/index.html`, label };",
  },
  {
    name: "Podpora: noga navodil",
    stage: "jezik",
    file: "scripts/build-guide.mjs",
    marker: "\"/podpri/index.html\"",
    find: "\"https://layerling.com/support.html\"",
    replace: "\"/podpri/index.html\"",
  },
  {
    name: "Prerez: sredina ravnine po izbiri (uvoz)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "getSectionBounds as getSectionBoundsAll",
    find: "DEFAULT_SECTION_SETTINGS, getSectionBounds, SECTION_AXES_SHOWN,",
    replace: "DEFAULT_SECTION_SETTINGS, getSectionBounds as getSectionBoundsAll, SECTION_AXES_SHOWN,",
  },
  {
    name: "Prerez: sredina ravnine po izbiri (funkcija)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "sectionSelectionIds",
    find: "/** The parts of a measurement that lie in the cutting plane, named like the position fields. */",
    replace: "// section-izbira: doseg drsnika ostane cel načrt, sredina pa je sredina izbranih objektov (če je kaj izbrano), da ravnina prereže tistega, ki ga izbereš.\nlet sectionSelectionIds: readonly string[] = [];\nfunction getSectionBounds(shapes: WorkplaneShape[], axis: SectionPlaneAxis, workspaceWidth?: number, workspaceDepth?: number, frame?: SectionFrame | null) {\n  const all = getSectionBoundsAll(shapes, axis, workspaceWidth, workspaceDepth, frame ?? null);\n  if (sectionSelectionIds.length === 0) return all;\n  const picked = shapes.filter((shape) => sectionSelectionIds.includes(shape.id) && !shape.hidden);\n  if (picked.length === 0) return all;\n  return { ...all, center: getSectionBoundsAll(picked, axis, workspaceWidth, workspaceDepth, frame ?? null).center };\n}\n\n/** The parts of a measurement that lie in the cutting plane, named like the position fields. */",
  },
  {
    name: "Prerez: izbira v zadnji izbiri za sredino",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "sectionSelectionIds = selectedIds",
    find: "  sectionMeasureModeRef.current = sectionMeasureMode;\n",
    replace: "  sectionMeasureModeRef.current = sectionMeasureMode;\n  sectionSelectionIds = selectedIds; // section-izbira\n",
  },
  {
    name: "Prerez: ravnina skoči na izbrani objekt",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "sectionSelectionKey",
    find: "  const handleToggleShowSectionPlane = useCallback((showPlane: boolean) => {",
    replace: "  // section-izbira: ko ob vklopljenem prerezu izbereš drug objekt, ravnina skoči na njegovo sredino.\n  const sectionSelectionKey = selectedIds.join(\"|\");\n  useEffect(() => {\n    if (!sectionSettingsRef.current.enabled || selectedIdsRef.current.length === 0) return;\n    const bounds = getSectionBounds(shapesRef.current, sectionSettingsRef.current.axis, workspaceRef.current.width, workspaceRef.current.depth);\n    setSectionSettings((prev) => (prev.enabled ? { ...prev, offset: bounds.center } : prev));\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [sectionSelectionKey]);\n\n  const handleToggleShowSectionPlane = useCallback((showPlane: boolean) => {",
  },
  {
    name: "STEP: luknja iz telesa z lastnimi luknjami je en sam rezalnik",
    file: "apps/web/src/lib/stepExport.ts",
    marker: "Desktop: a hole made of a solid with holes of its own",
    find: "/** The cutters among these shapes, a group of holes opened into the holes it holds. */\nfunction collectHoles(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[], holes: { box: Aabb; solid: BrepSolid }[]) {\n  for (const shape of shapes.filter((s) => s.hole)) {\n    const source = stepSourceForShape(shape);\n    if (source === \"unsupported\" && isOpenableGroup(shape)) {\n      collectHoles(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped, holes);\n      continue;\n    }\n    if (source === \"unsupported\") {\n      skipped.push(describe(shape, `hole ${unsupportedReason()}; cut omitted`));\n      continue;\n    }\n    // Eine Aussparung wird hier nur aus dem gebaut, was ohne Warten geht; eine\n    // eingelesene STEP-Quelle als Bohrer ist kein Fall, der vorkommt.\n    const built = source === \"primitive\" ? buildExactSolid(brep, shape) : source === \"profile\" ? buildProfileBody(brep, shape) : source === \"thread\" ? buildThreadBody(brep, shape) : source === \"spring\" ? buildSpringBody(brep, shape) : source === \"helicalGear\" ? buildHelicalGearBody(brep, shape) : source === \"gridfinity\" ? buildGridfinityBody(brep, shape) : buildBakedBody(brep, shape);\n    if (\"skip\" in built) {\n      skipped.push(describe(shape, `hole ${built.skip}; cut omitted`));\n      continue;\n    }\n    holes.push({ box: worldAabb(shape), solid: built.solid });\n  }\n}\n\n",
    replace: "/** The cutters among these shapes, a group of holes opened into the holes it holds. */\nasync function collectHoles(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[], holes: { box: Aabb; solid: BrepSolid }[]) {\n  for (const shape of shapes.filter((s) => s.hole)) {\n    const source = stepSourceForShape(shape);\n    if (source === \"unsupported\" && isOpenableGroup(shape)) {\n      const children = restoreGroupedChildren(shape).filter((child) => !child.hidden);\n      if (children.some((child) => !child.hole)) {\n        // Desktop: a hole made of a solid with holes of its own (e.g. a round pocket with scallops\n        // taken out of it) is one cutter, the solid minus its holes - not only the inner holes.\n        for (const part of await buildScope(brep, children, skipped)) holes.push({ box: part.box, solid: part.solid });\n      } else {\n        await collectHoles(brep, children, skipped, holes);\n      }\n      continue;\n    }\n    if (source === \"unsupported\") {\n      skipped.push(describe(shape, `hole ${unsupportedReason()}; cut omitted`));\n      continue;\n    }\n    // Eine Aussparung wird hier nur aus dem gebaut, was ohne Warten geht; eine\n    // eingelesene STEP-Quelle als Bohrer ist kein Fall, der vorkommt.\n    const built = source === \"primitive\" ? buildExactSolid(brep, shape) : source === \"profile\" ? buildProfileBody(brep, shape) : source === \"thread\" ? buildThreadBody(brep, shape) : source === \"spring\" ? buildSpringBody(brep, shape) : source === \"helicalGear\" ? buildHelicalGearBody(brep, shape) : source === \"gridfinity\" ? buildGridfinityBody(brep, shape) : buildBakedBody(brep, shape);\n    if (\"skip\" in built) {\n      skipped.push(describe(shape, `hole ${built.skip}; cut omitted`));\n      continue;\n    }\n    holes.push({ box: worldAabb(shape), solid: built.solid });\n  }\n}\n\n",
  },
  {
    name: "STEP: čakanje na rezalnike",
    file: "apps/web/src/lib/stepExport.ts",
    marker: "  await collectHoles(brep, shapes, skipped, holes);",
    find: "  collectHoles(brep, shapes, skipped, holes);\n\n  const parts: ScopePart[] = [];",
    replace: "  await collectHoles(brep, shapes, skipped, holes);\n\n  const parts: ScopePart[] = [];",
  },
  {
    name: "Strežnik: revizija na celo sekundo (sličice skupne mape in store.php)",
    file: "apps/web/src/app/api/shared-projects/route.ts",
    marker: "Math.floor(stat.mtimeMs / 1000) * 1000000",
    find: "  return `${stat.size.toString(16)}-${Math.round(stat.mtimeMs * 1000).toString(16)}`;",
    replace: "  // Namizna različica: čas na celo sekundo, enako kot store.php (PHP ne pozna delčkov sekunde); sicer sličice, ki jih zapiše eden, drugi ne najde.\n  return `${stat.size.toString(16)}-${(Math.floor(stat.mtimeMs / 1000) * 1000000).toString(16)}`;",
  },
  {
    name: "Izvozno okno: stanje za gumb Fusion (namizna različica)",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInFusion",
    find: "  const [exportFormat, setExportFormat] = useState<ExportFormat>(\"stl\");\n",
    replace: "  const [exportFormat, setExportFormat] = useState<ExportFormat>(\"stl\");\n  const [openInFusion, setOpenInFusion] = useState(false);\n  const [isDesktopApp, setIsDesktopApp] = useState(false);\n  useEffect(() => setIsDesktopApp(!!(window as unknown as { layerlingDesktop?: unknown }).layerlingDesktop), []);\n",
  },
  {
    name: "Izvozno okno: izvoz STEP pove namizni različici, ali naj ga odpre v Fusionu",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setStepToFusion",
    find: "    else if (exportFormat === \"step\") onExportStep(exportName, toServer);",
    replace: "    else if (exportFormat === \"step\") {\n      try { (window as unknown as { layerlingDesktop?: { setStepToFusion?: (on: boolean) => void } }).layerlingDesktop?.setStepToFusion?.(openInFusion && !toServer); } catch { /* spletna različica nima vmesnika */ }\n      onExportStep(exportName, toServer);\n    }",
  },
  {
    name: "Izvozno okno: izbira formata ugasne Fusion",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInFusion(false)",
    find: "onClick={() => setExportFormat(format)}",
    replace: "onClick={() => { setExportFormat(format); setOpenInFusion(false); }}",
  },
  {
    name: "Izvozno okno: gumb STEP ni izbran, ko je izbran Fusion",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "aria-checked={exportFormat === format && !(format === \"step\" && ",
    find: "aria-checked={exportFormat === format}",
    replace: "aria-checked={exportFormat === format && !(format === \"step\" && openInFusion)}",
  },
  {
    name: "Izvozno okno: drsnik formatov ne označi nobenega, ko je izbran Fusion",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "\"fusion\" : exportFormat",
    find: "data-format={exportFormat} role=\"radiogroup\"",
    replace: "data-format={openInFusion && exportFormat === \"step\" ? \"fusion\" : exportFormat} role=\"radiogroup\"",
  },
  {
    name: "Izvozno okno: vrstica »Program« z gumbom Fusion",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "export-program-button",
    find: "          {exportFormat === \"drawing\" ? (\n            <section className=\"export-setting-section\">",
    replace: "          {isDesktopApp ? (\n            <section className=\"export-setting-section\">\n              <div className=\"export-section-heading\">\n                <div>\n                  <strong>Program</strong>\n                </div>\n              </div>\n              <div role=\"radiogroup\" aria-label=\"Program\">\n                <button\n                  type=\"button\"\n                  role=\"radio\"\n                  className=\"export-program-button\"\n                  aria-checked={openInFusion && exportFormat === \"step\"}\n                  title=\"STEP\"\n                  onClick={() => { setExportFormat(\"step\"); setOpenInFusion(true); }}\n                >\n                  Fusion\n                </button>\n              </div>\n            </section>\n          ) : null}\n\n          {exportFormat === \"drawing\" ? (\n            <section className=\"export-setting-section\">",
  },
  {
    name: "Izvozno okno: slog gumba Fusion",
    file: "apps/web/src/app/globals.css",
    marker: "export-program-button",
    find: ".export-format-slider[data-format=\"drawing\"]::before {",
    replace: ".export-format-slider[data-format=\"fusion\"]::before {\n  display: none;\n}\n\n.export-program-button {\n  height: 38px;\n  padding: 0 22px;\n  color: #94816c;\n  font-size: 12px;\n  font-weight: 850;\n  letter-spacing: 0.02em;\n  background: #f6f2ec;\n  border: 1px solid #ede6d9;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.export-program-button:hover {\n  color: #6a4722;\n}\n\n.export-program-button[aria-checked=\"true\"] {\n  color: #9f5508;\n  background: #fff;\n  border-color: #ddab78;\n  box-shadow: 0 2px 7px rgba(89, 59, 27, 0.12);\n}\n\n.export-format-slider[data-format=\"drawing\"]::before {",
  },
  {
    name: "Izvozno okno: stanje za gumb SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInSolidcraft",
    find: "  const [openInFusion, setOpenInFusion] = useState(false);\n",
    replace: "  const [openInFusion, setOpenInFusion] = useState(false);\n  const [openInSolidcraft, setOpenInSolidcraft] = useState(false);\n",
  },
  {
    name: "Izvozno okno: izvoz STEP pove namizni različici, ali naj ga odpre v programu SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setStepToSolidcraft",
    find: "      onExportStep(exportName, toServer);\n    }",
    replace: "      try { (window as unknown as { layerlingDesktop?: { setStepToSolidcraft?: (on: boolean) => void } }).layerlingDesktop?.setStepToSolidcraft?.(openInSolidcraft && !toServer); } catch { /* spletna različica nima vmesnika */ }\n      onExportStep(exportName, toServer);\n    }",
  },
  {
    name: "Izvozno okno: izbira formata ugasne tudi SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInFusion(false); setOpenInSolidcraft(false)",
    find: "onClick={() => { setExportFormat(format); setOpenInFusion(false); }}",
    replace: "onClick={() => { setExportFormat(format); setOpenInFusion(false); setOpenInSolidcraft(false); }}",
  },
  {
    name: "Izvozno okno: gumb STEP ni izbran, ko je izbran SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "(openInFusion || openInSolidcraft)",
    find: "aria-checked={exportFormat === format && !(format === \"step\" && openInFusion)}",
    replace: "aria-checked={exportFormat === format && !(format === \"step\" && (openInFusion || openInSolidcraft))}",
  },
  {
    name: "Izvozno okno: drsnik formatov ne označi nobenega, ko je izbran SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "(openInFusion || openInSolidcraft) && exportFormat",
    find: "data-format={openInFusion && exportFormat === \"step\" ? \"fusion\" : exportFormat}",
    replace: "data-format={(openInFusion || openInSolidcraft) && exportFormat === \"step\" ? \"fusion\" : exportFormat}",
  },
  {
    name: "Izvozno okno: gumb Fusion ugasne SolidCraft",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInFusion(true); setOpenInSolidcraft(false)",
    find: "onClick={() => { setExportFormat(\"step\"); setOpenInFusion(true); }}",
    replace: "onClick={() => { setExportFormat(\"step\"); setOpenInFusion(true); setOpenInSolidcraft(false); }}",
  },
  {
    name: "Izvozno okno: gumb SolidCraft v vrstici »Program«",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "aria-checked={openInSolidcraft",
    find: "                  Fusion\n                </button>\n",
    replace: "                  Fusion\n                </button>\n                <button\n                  type=\"button\"\n                  role=\"radio\"\n                  className=\"export-program-button\"\n                  aria-checked={openInSolidcraft && exportFormat === \"step\"}\n                  title=\"STEP\"\n                  onClick={() => { setExportFormat(\"step\"); setOpenInSolidcraft(true); setOpenInFusion(false); }}\n                >\n                  SolidCraft\n                </button>\n",
  },
  {
    name: "Izvozno okno: razmik med gumboma v vrstici »Program«",
    file: "apps/web/src/app/globals.css",
    marker: "div[aria-label=\"Program\"]",
    find: ".export-program-button {\n  height: 38px;",
    replace: "div[aria-label=\"Program\"] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.export-program-button {\n  height: 38px;",
  },
  {
    name: "Imena gumbov: zagonski skript v glavi strani",
    file: "apps/web/src/app/layout.tsx",
    marker: "TOOL_LABELS_BOOT_SCRIPT",
    find: "import { TOOLBAR_SIZE_BOOT_SCRIPT } from \"@/lib/toolbarSize\";\n",
    replace: "import { TOOLBAR_SIZE_BOOT_SCRIPT } from \"@/lib/toolbarSize\";\nimport { TOOL_LABELS_BOOT_SCRIPT } from \"@/lib/toolLabels\";\n",
  },
  {
    name: "Imena gumbov: zagonski skript se izvede pred prvim izrisom",
    file: "apps/web/src/app/layout.tsx",
    marker: "__html: TOOL_LABELS_BOOT_SCRIPT",
    find: "        <script dangerouslySetInnerHTML={{ __html: TOOLBAR_SIZE_BOOT_SCRIPT }} />\n",
    replace: "        <script dangerouslySetInnerHTML={{ __html: TOOLBAR_SIZE_BOOT_SCRIPT }} />\n        <script dangerouslySetInnerHTML={{ __html: TOOL_LABELS_BOOT_SCRIPT }} />\n",
  },
  {
    name: "Imena gumbov: uvoz v nastavitvah delovnega prostora",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "useToolLabels",
    find: "import { useToolbarSize } from \"@/lib/useToolbarSize\";\n",
    replace: "import { useToolbarSize } from \"@/lib/useToolbarSize\";\nimport { setToolLabels, TOOL_LABELS_OPTIONS, type ToolLabels } from \"@/lib/toolLabels\";\nimport { useToolLabels } from \"@/lib/useToolLabels\";\n",
  },
  {
    name: "Imena gumbov: besedila možnosti",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "TOOL_LABELS_LABEL_KEYS",
    find: "const TOOLBAR_SIZE_LABEL_KEYS: Record<ToolbarSize, MessageKey> = {",
    replace: "const TOOL_LABELS_LABEL_KEYS: Record<ToolLabels, MessageKey> = {\n  icons: \"workspace.toolLabelsIcons\",\n  both: \"workspace.toolLabelsBoth\",\n  text: \"workspace.toolLabelsText\",\n};\n\nconst TOOLBAR_SIZE_LABEL_KEYS: Record<ToolbarSize, MessageKey> = {",
  },
  {
    name: "Imena gumbov: stanje v nastavitvah",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "const toolLabels = useToolLabels();",
    find: "  const toolbarSize = useToolbarSize();\n",
    replace: "  const toolbarSize = useToolbarSize();\n  const toolLabels = useToolLabels();\n",
  },
  {
    name: "Imena gumbov: izbirnik pod velikostjo orodne vrstice",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: "workspace.toolLabels\")}",
    find: "                          {t(TOOLBAR_SIZE_LABEL_KEYS[size])}\n                        </option>\n                      ))}\n                    </select>\n                  </label>\n",
    replace: "                          {t(TOOLBAR_SIZE_LABEL_KEYS[size])}\n                        </option>\n                      ))}\n                    </select>\n                  </label>\n                  <label className=\"workspace-select\" data-help={t(\"workspace.toolLabels\")}>\n                    <span>{t(\"workspace.toolLabels\")}</span>\n                    <select\n                      value={toolLabels}\n                      onChange={(event) => setToolLabels(event.currentTarget.value as ToolLabels)}\n                    >\n                      {TOOL_LABELS_OPTIONS.map((mode) => (\n                        <option key={mode} value={mode}>\n                          {t(TOOL_LABELS_LABEL_KEYS[mode])}\n                        </option>\n                      ))}\n                    </select>\n                  </label>\n",
  },
  {
    name: "Imena gumbov: slog (ikone + ime, samo ime)",
    file: "apps/web/src/app/globals.css",
    marker: "data-tool-labels",
    find: ".toolbar-icon:disabled {\n  pointer-events: none;\n}\n",
    replace: ".toolbar-icon:disabled {\n  pointer-events: none;\n}\n\n/* Imena gumbov v orodni vrstici: ikone + ime (both) ali samo ime (text); brez atributa so samo ikone. */\nhtml[data-tool-labels] .toolbar-section-tools .toolbar-icon,\nhtml[data-tool-labels] .toolbar-section-tools .shape-menu-trigger,\nhtml[data-tool-labels] .toolbar-section .action-icon-button {\n  height: auto;\n  width: auto;\n  max-width: 78px;\n  align-content: center;\n  gap: 1px;\n}\nhtml[data-tool-labels] .toolbar-section-tools .toolbar-icon::after,\nhtml[data-tool-labels] .toolbar-section-tools .shape-menu-trigger::after,\nhtml[data-tool-labels] .toolbar-section .action-icon-button::after {\n  content: attr(aria-label);\n  display: block;\n  max-width: 100%;\n  font-size: 9.5px;\n  font-weight: 700;\n  line-height: 1.12;\n  text-align: center;\n  overflow-wrap: break-word;\n  color: inherit;\n}\nhtml[data-tool-labels=\"both\"] { --editor-toolbar-tools-height: 98px; }\nhtml[data-tool-labels=\"both\"][data-toolbar-size=\"small\"] { --editor-toolbar-tools-height: 87px; }\nhtml[data-tool-labels=\"both\"][data-toolbar-size=\"large\"] { --editor-toolbar-tools-height: 109px; }\nhtml[data-tool-labels=\"both\"] .toolbar-section-tools .toolbar-icon,\nhtml[data-tool-labels=\"both\"] .toolbar-section-tools .shape-menu-trigger,\nhtml[data-tool-labels=\"both\"] .toolbar-section .action-icon-button {\n  min-width: calc(var(--toolbar-icon-size) + 12px);\n  padding: 2px 3px 1px;\n  grid-auto-flow: row;\n}\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .toolbar-icon > *,\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .shape-menu-trigger > *,\nhtml[data-tool-labels=\"text\"] .toolbar-section .action-icon-button > * {\n  display: none;\n}\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .toolbar-icon,\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .shape-menu-trigger,\nhtml[data-tool-labels=\"text\"] .toolbar-section .action-icon-button {\n  min-width: 42px;\n  min-height: calc(var(--toolbar-icon-size) - 8px);\n  padding: 3px 4px;\n}\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .toolbar-icon::after,\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .shape-menu-trigger::after,\nhtml[data-tool-labels=\"text\"] .toolbar-section .action-icon-button::after {\n  font-size: 11px;\n}\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .toolbar-icon,\nhtml[data-tool-labels=\"text\"] .toolbar-section-tools .shape-menu-trigger,\nhtml[data-tool-labels=\"text\"] .toolbar-section .action-icon-button {\n  max-width: 92px;\n}\nhtml[data-tool-labels] .toolbar-mode-content,\nhtml[data-tool-labels] .sketch-toolbar-ribbon {\n  flex-wrap: wrap;\n  height: auto;\n}\nhtml[data-tool-labels] .toolbar-section-tools .toolbar-icon,\nhtml[data-tool-labels] .toolbar-section-tools .shape-menu-trigger,\nhtml[data-tool-labels] .toolbar-section .action-icon-button {\n  flex: 0 0 auto;\n}\n",
  },
  ...Object.entries(TOOL_LABEL_TEXTS).map(([lang, texts]) => ({
    name: `Imena gumbov: besedila (${lang})`,
    file: `apps/web/src/lib/messages.${lang}.ts`,
    marker: '"workspace.toolLabels":',
    find: '  "workspace.toolbarSizeLarge":',
    replace: [
      `  "workspace.toolLabels": ${JSON.stringify(texts[0])},`,
      `  "workspace.toolLabelsIcons": ${JSON.stringify(texts[1])},`,
      `  "workspace.toolLabelsBoth": ${JSON.stringify(texts[2])},`,
      `  "workspace.toolLabelsText": ${JSON.stringify(texts[3])},`,
      '  "workspace.toolbarSizeLarge":',
    ].join("\n"),
  })),
  {
    name: "Imena gumbov: skupine se pri prelomu vrstice lomijo vsaka zase",
    file: "apps/web/src/app/globals.css",
    marker: "toolbar-mode-content > .tool-group",
    find: ".toolbar-icon:disabled {\n  pointer-events: none;\n}\n",
    replace: ".toolbar-icon:disabled {\n  pointer-events: none;\n}\n\n/* Ko se orodna vrstica prelomi (imena gumbov, velike ikone), se odseki lomijo vsak zase: v prvi vrstici ostane toliko skupin,\n   kolikor jih gre, ne da bi se cela leva ali desna skupina preselila v novo vrstico. */\nhtml[data-tool-labels] .toolbar-mode-content > .tool-group,\nhtml[data-toolbar-size=\"large\"] .toolbar-mode-content > .tool-group {\n  display: contents;\n}\n",
  },
  {
    name: "Imena gumbov: Upravljanje v prvi vrstici, Pomoč desno v drugi",
    file: "apps/web/src/app/globals.css",
    marker: 'toolbar-mode-content > [data-group="help"]',
    find: "html[data-toolbar-size=\"large\"] .toolbar-mode-content > .tool-group {\n  display: contents;\n}\n",
    replace: "html[data-toolbar-size=\"large\"] .toolbar-mode-content > .tool-group {\n  display: contents;\n}\n" + "\n/* Ko se orodna vrstica lomi: Upravljanje gre v prvo vrstico, Razporeditev in Pomo\u010d v drugo; Pomo\u010d je vedno skrajno desno. */\nhtml[data-tool-labels] .toolbar-mode-content > [data-group=\"manage\"],\nhtml[data-toolbar-size=\"large\"] .toolbar-mode-content > [data-group=\"manage\"] {\n  order: 1;\n}\nhtml[data-tool-labels] .toolbar-mode-content > .tool-group > [data-group=\"arrange\"],\nhtml[data-toolbar-size=\"large\"] .toolbar-mode-content > .tool-group > [data-group=\"arrange\"] {\n  order: 2;\n}\nhtml[data-tool-labels] .toolbar-mode-content > [data-group=\"help\"],\nhtml[data-toolbar-size=\"large\"] .toolbar-mode-content > [data-group=\"help\"] {\n  order: 3;\n  margin-left: auto;\n}\n",
  },
  {
    name: "Noga: povezava na projekt vodi na naš GitHub",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "<a href={SOURCE_CODE_URL} target=\"_blank\" rel=\"noreferrer\" key=\"readme\">",
    find: "<a href={readmeUrl(language)} target=\"_blank\" rel=\"noreferrer\" key=\"readme\">",
    replace: "<a href={SOURCE_CODE_URL} target=\"_blank\" rel=\"noreferrer\" key=\"readme\">",
  },
  {
    name: "Noga: Kaj je novega vodi na naše izdaje",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "rel=\"noreferrer\"\n              key=\"whats-new\"",
    find: "href=\"#\"\n              role=\"button\"\n              key=\"whats-new\"\n              onClick={(event) => {\n                event.preventDefault();\n                window.dispatchEvent(new Event(SHOW_WHATS_NEW_EVENT));\n              }}",
    replace: "href={releaseNotesUrl()}\n              target=\"_blank\"\n              rel=\"noreferrer\"\n              key=\"whats-new\"",
  },
  {
    name: "Noga: opombe ob izdaji kažejo našo različico",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "process.env.NEXT_PUBLIC_CDS_VERSION ?",
    find: "<a href={releaseNotesUrl()} target=\"_blank\" rel=\"noreferrer\" key=\"releases\" data-help={t(\"dashboard.footerHelp\")}>\n            {t(\"dashboard.releaseNotes\", { version })}",
    replace: "<a href={process.env.NEXT_PUBLIC_CDS_VERSION ? `${releaseNotesUrl()}/tag/v${process.env.NEXT_PUBLIC_CDS_VERSION}` : releaseNotesUrl()} target=\"_blank\" rel=\"noreferrer\" key=\"releases\" data-help={t(\"dashboard.footerHelp\")}>\n            {t(\"dashboard.releaseNotes\", { version: process.env.NEXT_PUBLIC_CDS_VERSION || version })}",
  },
  {
    name: "Izvozno okno: stanje za gumb BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInBambu",
    find: "  const [openInSolidcraft, setOpenInSolidcraft] = useState(false);\n",
    replace: "  const [openInSolidcraft, setOpenInSolidcraft] = useState(false);\n  const [openInBambu, setOpenInBambu] = useState(false);\n",
  },
  {
    name: "Izvozno okno: izvoz OBJ pove namizni različici, ali naj ga odpre v Bambu Studiu",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setObjToBambu",
    find: "    else onExport(exportFormat, exportName, false, exportFormat === \"dxf\" ? dxfView : svgView, toServer);",
    replace: "    else {\n      try { (window as unknown as { layerlingDesktop?: { setObjToBambu?: (on: boolean) => void } }).layerlingDesktop?.setObjToBambu?.(openInBambu && exportFormat === \"obj\" && !toServer); } catch { /* spletna različica nima vmesnika */ }\n      onExport(exportFormat, exportName, false, exportFormat === \"dxf\" ? dxfView : svgView, toServer);\n    }",
  },
  {
    name: "Izvozno okno: izbira formata ugasne tudi BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInSolidcraft(false); setOpenInBambu(false)",
    find: "onClick={() => { setExportFormat(format); setOpenInFusion(false); setOpenInSolidcraft(false); }}",
    replace: "onClick={() => { setExportFormat(format); setOpenInFusion(false); setOpenInSolidcraft(false); setOpenInBambu(false); }}",
  },
  {
    name: "Izvozno okno: gumb OBJ ni izbran, ko je izbran BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "!(format === \"obj\" && openInBambu)",
    find: "aria-checked={exportFormat === format && !(format === \"step\" && (openInFusion || openInSolidcraft))}",
    replace: "aria-checked={exportFormat === format && !(format === \"step\" && (openInFusion || openInSolidcraft)) && !(format === \"obj\" && openInBambu)}",
  },
  {
    name: "Izvozno okno: drsnik formatov ne označi nobenega, ko je izbran BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "(openInBambu && exportFormat === \"obj\") ? \"fusion\"",
    find: "data-format={(openInFusion || openInSolidcraft) && exportFormat === \"step\" ? \"fusion\" : exportFormat}",
    replace: "data-format={((openInFusion || openInSolidcraft) && exportFormat === \"step\") || (openInBambu && exportFormat === \"obj\") ? \"fusion\" : exportFormat}",
  },
  {
    name: "Izvozno okno: gumba Fusion in SolidCraft ugasneta BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInSolidcraft(false); setOpenInBambu(false); }}\n                >\n                  Fusion",
    find: "onClick={() => { setExportFormat(\"step\"); setOpenInFusion(true); setOpenInSolidcraft(false); }}",
    replace: "onClick={() => { setExportFormat(\"step\"); setOpenInFusion(true); setOpenInSolidcraft(false); setOpenInBambu(false); }}",
  },
  {
    name: "Izvozno okno: gumb SolidCraft ugasne BambuStudio",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "setOpenInFusion(false); setOpenInBambu(false); }}",
    find: "onClick={() => { setExportFormat(\"step\"); setOpenInSolidcraft(true); setOpenInFusion(false); }}",
    replace: "onClick={() => { setExportFormat(\"step\"); setOpenInSolidcraft(true); setOpenInFusion(false); setOpenInBambu(false); }}",
  },
  {
    name: "Izvozno okno: gumb BambuStudio v vrstici »Program«",
    file: "apps/web/src/components/workplane/TopActionPanel.tsx",
    marker: "aria-checked={openInBambu",
    find: "                  SolidCraft\n                </button>\n",
    replace: "                  SolidCraft\n                </button>\n                <button\n                  type=\"button\"\n                  role=\"radio\"\n                  className=\"export-program-button\"\n                  aria-checked={openInBambu && exportFormat === \"obj\"}\n                  title=\"OBJ\"\n                  onClick={() => { setExportFormat(\"obj\"); setOpenInBambu(true); setOpenInFusion(false); setOpenInSolidcraft(false); }}\n                >\n                  BambuStudio\n                </button>\n",
  },
];

/** Datoteke, ki jih popravki dodajo. */
export const additions = [
  { stage: "jezik", from: "patches/files/userFonts.ts", to: "apps/web/src/lib/userFonts.ts" },
  { stage: "jezik", from: "patches/files/DesktopVersion.tsx", to: "apps/web/src/components/DesktopVersion.tsx" },
  { from: "patches/files/desktopBridge.ts", to: "apps/web/src/lib/desktopBridge.ts" },
  { from: "patches/files/toolLabels.ts", to: "apps/web/src/lib/toolLabels.ts" },
  { from: "patches/files/useToolLabels.ts", to: "apps/web/src/lib/useToolLabels.ts" },
  { from: "patches/files/podpri.html", to: "apps/web/public/podpri/index.html", stage: "jezik" },
  { from: "patches/files/assets/cds-round.png", to: "apps/web/public/assets/cds/cds-round.png", stage: "jezik" },
];

/** `stage`: "osnova" (namizni most, brez jezika), "jezik" (slovenščina) ali neopredeljeno = vse. Testi originalnega programa tečejo po fazi "osnova". */
if (local?.extendPatches) local.extendPatches({ edits, additions });

export function applyPatches(upstreamDir, { log = console.log, stage } = {}) {
  const root = resolve(upstreamDir);
  const projectRoot = resolve(here, "..");
  const problems = [];
  const wanted = (item) => !stage || (item.stage ?? "osnova") === stage;
  for (const edit of edits.filter(wanted)) {
    const target = join(root, edit.file);
    if (!existsSync(target)) {
      problems.push(`${edit.file}: datoteke ni več (${edit.name})`);
      continue;
    }
    const source = readFileSync(target, "utf8");
    if (source.includes(edit.marker)) {
      log(`  že uporabljeno: ${edit.name}`);
      continue;
    }
    const count = source.split(edit.find).length - 1;
    if (count !== 1) {
      problems.push(`${edit.file}: sidro za "${edit.name}" najdeno ${count}-krat (pričakovano 1). Originalna koda se je spremenila – popravek je treba ročno uskladiti.`);
      continue;
    }
    writeFileSync(target, source.replace(edit.find, () => edit.replace));
    log(`  uporabljeno: ${edit.name}`);
  }
  for (const add of additions.filter(wanted)) {
    const from = join(projectRoot, add.from);
    const to = join(root, add.to);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    log(`  dodano: ${add.to}`);
  }
  if (wanted({ stage: "jezik" })) {
    // Novosti: prevod za nedavne različice v ključu "sl", starejše ostanejo v angleščini.
    const file = join(root, "apps/web/src/lib/whatsNew.json");
    if (existsSync(file)) {
      const sl = JSON.parse(readFileSync(join(projectRoot, "patches/files/whatsNew.sl.json"), "utf8"));
      const data = JSON.parse(readFileSync(file, "utf8"));
      for (const entry of data) {
        const translated = sl[entry.version];
        if (!translated || translated.length !== entry.items.length) continue;
        entry.items.forEach((item, index) => {
          item.title.sl = translated[index][0];
          item.body.sl = translated[index][1];
        });
      }
      writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
      log("  prevedene novosti (whatsNew.json)");
    } else problems.push("apps/web/src/lib/whatsNew.json: datoteke ni več");
  }
  if (local?.applyExtra) local.applyExtra({ root, projectRoot, wanted, log, problems });
  // Izvedena grafitna tema (apps/web/src/app/graphite.generated.css ali podobno) mora ustrezati globals.css, sicer
  // preizkus graphiteTheme odpove. Po naših dopolnitvah CSS jo zato ponovno ustvarimo.
  const graphiteScript = join(root, "scripts/generate-graphite-theme.mjs");
  if (wanted({}) && existsSync(graphiteScript)) {
    const run = spawnSync(process.execPath, [graphiteScript], { cwd: root, encoding: "utf8" });
    if (run.status === 0) log("  grafitna tema ponovno ustvarjena");
    else problems.push(`scripts/generate-graphite-theme.mjs: ${String(run.stderr || run.stdout).slice(0, 300)}`);
  }
  if (problems.length) {
    const error = new Error(`Popravkov ni bilo mogoče uporabiti:\n - ${problems.join("\n - ")}`);
    error.problems = problems;
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) {
    console.error("Uporaba: node patches/apply.mjs <mapa z originalno kodo>");
    process.exit(2);
  }
  try {
    applyPatches(target);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
