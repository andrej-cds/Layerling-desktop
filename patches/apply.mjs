// Popravki originalnega programa za namizno različico.
//
// Namenoma so majhni in se vežejo na besedilna sidra, ne na številke vrstic, zato preživijo večino
// posodobitev. Če sidra ni več (ali je dvoumno), skripta glasno odpove in pove, katero datoteko je treba pogledati.
//
// Uporaba: node patches/apply.mjs <pot do mape z originalno kodo>
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Neobvezna lokalna razširitev (patches/local/apply-local.mjs). Če je ni, se ne zgodi nič.
const localFile = join(here, "local", "apply-local.mjs");
const local = existsSync(localFile) ? await import(pathToFileURL(localFile).href) : null;

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
    file: "apps/web/src/components/WorkplaneViewport.tsx",
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
    file: "apps/web/src/components/LayerlingEditor.tsx",
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
];

/** Datoteke, ki jih popravki dodajo. */
export const additions = [
  { stage: "jezik", from: "patches/files/userFonts.ts", to: "apps/web/src/lib/userFonts.ts" },
  { stage: "jezik", from: "patches/files/DesktopVersion.tsx", to: "apps/web/src/components/DesktopVersion.tsx" },
  { from: "patches/files/desktopBridge.ts", to: "apps/web/src/lib/desktopBridge.ts" },
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
