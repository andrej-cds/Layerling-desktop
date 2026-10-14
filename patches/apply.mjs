// Popravki originalnega programa za namizno različico.
//
// Namenoma so majhni in se vežejo na besedilna sidra, ne na številke vrstic, zato preživijo večino
// posodobitev. Če sidra ni več (ali je dvoumno), skripta glasno odpove in pove, katero datoteko je treba pogledati.
//
// Uporaba: node patches/apply.mjs <pot do mape z originalno kodo>
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

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
    find: 'import { backupEntryNames, backupFileName, isBackupFileName, packBackup, unpackBackup, zipHoldsDesigns } from "@/lib/projectBackup";',
    replace:
      'import { backupEntryNames, backupFileName, isBackupFileName, packBackup, unpackBackup, zipHoldsDesigns } from "@/lib/projectBackup";\nimport { useDesktopBridge } from "@/lib/desktopBridge";',
  },
  {
    name: "Nadzorna plošča: kavelj mostu",
    file: "apps/web/src/app/page.tsx",
    marker: "useDesktopBridge({",
    find: "  const openLatestProject = () => {",
    replace:
      "  // Namizna različica: samodejno shranjevanje na disk in odpiranje datotek iz lupine (v brskalniku brez učinka).\n  useDesktopBridge({ projects, getBytes: projectPackageBytes, openFiles: importFilesFromDashboard });\n\n  const openLatestProject = () => {",
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
    find: '    if (!window.isSecureContext || !("serviceWorker" in navigator) || runsAsInstalledApp()) return;',
    replace:
      '    if ((window as unknown as { layerlingDesktop?: unknown }).layerlingDesktop) return;\n    if (!window.isSecureContext || !("serviceWorker" in navigator) || runsAsInstalledApp()) return;',
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
    name: "Zmogljivost: podpis materiala ne vsebuje cele slike",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "imageDataSig",
    find: '    imageData: shape.imagePlate?.dataUrl ?? "",',
    replace:
      '    // imageDataSig: celotna slika (več MB) bi se ob vsakem premiku znova stringificirala; identiteto že pove imagePlate zgoraj, tu je le vzorec.\n    imageData: ((u: string) => `${u.length}:${u.slice(0, 48)}${u.slice(Math.floor(u.length / 3), Math.floor(u.length / 3) + 48)}${u.slice(Math.floor((u.length * 2) / 3), Math.floor((u.length * 2) / 3) + 48)}${u.slice(-48)}`)(shape.imagePlate?.dataUrl ?? ""),',
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
    find: "    if (event.pointerType !== \"touch\" && (event.button === 1 || event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {\n      cameraPointers.set(event.pointerId, event);\n    }\n    controls.mouseButtons.LEFT = event.button === 0 && (event.ctrlKey || event.metaKey) ? THREE.MOUSE.PAN : null;",
    replace: "    const mouseRotateOn = event.pointerType !== \"touch\" && event.button === 0 && !event.ctrlKey && !event.metaKey && (window as unknown as { __lylMouseRotate?: boolean }).__lylMouseRotate === true;\n    if (event.pointerType !== \"touch\" && (event.button === 1 || event.button === 2 || mouseRotateOn || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {\n      cameraPointers.set(event.pointerId, event);\n    }\n    controls.mouseButtons.LEFT = event.button === 0 && (event.ctrlKey || event.metaKey) ? THREE.MOUSE.PAN : mouseRotateOn ? THREE.MOUSE.ROTATE : null;",
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
    name: "Pogled: en prst na praznem prostoru vedno vrti pogled",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "touch-orbit-samodejno",
    find: "        marquee.hasMoved = marquee.hasMoved || Math.hypot(marquee.currentX - marquee.startX, marquee.currentY - marquee.startY) > 5;\n        setMarqueeFromState(marquee);\n        return;",
    replace: "        marquee.hasMoved = marquee.hasMoved || Math.hypot(marquee.currentX - marquee.startX, marquee.currentY - marquee.startY) > 5;\n        // touch-orbit-samodejno: en prst, ki se z praznega prostora premakne, vrti pogled (izbirni okvir je za miško).\n        // Prst na telesu ali ročaju dela po starem, zato stikalo za vrtenje ni več potrebno.\n        if (marquee.hasMoved && event.pointerType === \"touch\" && !marquee.additive) {\n          if (event.currentTarget.hasPointerCapture(marquee.pointerId)) event.currentTarget.releasePointerCapture(marquee.pointerId);\n          cancelGestureForCamera();\n          cameraTouchRef.current = true;\n          handOverTouchToCamera();\n          return;\n        }\n        setMarqueeFromState(marquee);\n        return;",
  },
  {
    name: "Pogled: prvi prst novega dotika ponastavi stanje kamere",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "touch-primary-reset",
    find: "        touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });\n        if (cameraTouchRef.current) return;",
    replace: "        // touch-primary-reset: prvi prst novega dotika vedno začne s čistim stanjem (če je kak konec dotika izostal, kamera ne ostane zaklenjena).\n        if (event.isPrimary) {\n          touchPointersRef.current.clear();\n          cameraTouchRef.current = false;\n        }\n        touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });\n        if (cameraTouchRef.current) return;",
  },
  {
    name: "Izbira: dotik na drugo telo ga doda izbiri",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "touch-dodaj-izbiri",
    find: "      const id = pickShape(event.clientX, event.clientY, event.pointerType);\n      const additive = event.shiftKey;",
    replace: "      const id = pickShape(event.clientX, event.clientY, event.pointerType);\n      // touch-dodaj-izbiri: na zaslonu na dotik ni Shifta; ko je že kaj označeno, dotik na drugo telo doda izbiri (dotik na označeno telo brez premika ga odvzame).\n      const additive = event.shiftKey || (event.pointerType === \"touch\" && Boolean(id) && selectedIdsRef.current.length > 0);",
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
    replace: "const BUILT_IN_FONT_NAMES = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\"];\nlet userFontNames: string[] = [];\nlet userFontsPromise: Promise<void> | null = null;\n\n/** Vse pisave za seznam: vgrajene in lastne iz mape s pisavami (namizna različica). */\nexport function textFontNames(): string[] {\n  return [...BUILT_IN_FONT_NAMES, ...userFontNames];\n}\n\nasync function loadUserTextFonts(): Promise<void> {\n  const extra = await readUserFontData();\n  if (!loadedFonts || extra.length === 0) return;\n  const sans = loadedFonts.Sans?.data as FontData | undefined;\n  const loader = new FontLoader();\n  for (const [name, data] of extra) {\n    if (BUILT_IN_FONT_NAMES.includes(name) || userFontNames.includes(name)) continue;\n    // Manjkajoče črke (npr. č, š, ž) si pisava izposodi iz pisave Sans.\n    loadedFonts[name] = loader.parse(sans ? withFallbackGlyphs(data, sans) : data);\n    userFontNames.push(name);\n  }\n}\n\nexport function loadTextFonts(): Promise<void> {\n  return loadBuiltInTextFonts().then(() => (userFontsPromise ??= loadUserTextFonts().catch(() => undefined)));\n}\n\nfunction loadBuiltInTextFonts(): Promise<void> {\n  if (loadedFonts) return Promise.resolve();",
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
    find: "const TEXT_FONT_OPTIONS = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\"];",
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
    find: "const TEXT_FONT_OPTIONS = [\"Multilanguage\", \"Sans\", \"Serif\", \"Script\", \"Monospace\", \"Rounded\", \"Stencil\"];",
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
    name: "Navodila: slovenske črke v sidrih",
    stage: "jezik",
    file: "scripts/build-guide.mjs",
    marker: '.replace(/č/g, "c")',
    find: '.replace(/ß/g, "ss")',
    replace: '.replace(/ß/g, "ss").replace(/č/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "d")',
  },
  {
    name: "Slovenščina: tabela jezikov (slovenščina v mestu nemščine)",
    stage: "jezik",
    file: "apps/web/src/lib/languages.ts",
    marker: "Slovenščina v mestu nemščine",
    find: "  de: {\n    name: \"Deutsch\",\n    htmlLang: \"de\",\n    numberLocale: \"de-DE\",\n    quotes: [\"„\", \"“\"],\n    guideDir: \"anleitung\",\n    communityUrl: DRUCKTIPPS_FORUM,\n    readme: \"README.de.md\",\n    quickstartAnchor: \"schnellstart-unter-windows\",\n    legal: { imprint: \"Impressum\", privacy: \"Datenschutz\" },\n    keyNames: { Ctrl: \"Strg\", Shift: \"Umschalt\", Delete: \"Entf\", Backspace: \"Rücktaste\", Home: \"Pos1\", Click: \"Klick\", RightClick: \"Rechtsklick\", Drag: \"Ziehen\" },\n    asciiUmlauts: true,\n    complete: true,\n    guide: {\n      site: \"layerling Anleitung\",\n      home: \"Anleitung\",\n      openEditor: \"Zum Editor\",\n      backToEditor: \"Zurück zum Editor\",\n      editorElsewhere: \"Der Editor ist schon in einem anderen Tab offen - wechsle einfach dorthin.\",\n      chapters: \"Kapitel\",\n      onThisPage: \"Auf dieser Seite\",\n      previous: \"Vorheriges Kapitel\",\n      next: \"Nächstes Kapitel\",\n      overviewLead: \"Alles, was layerling kann, Schritt für Schritt. Die Bilder entstehen aus dem laufenden Programm und werden mit jeder Fassung neu aufgenommen.\",\n      sourceNote: \"Diese Anleitung wächst mit dem Programm. Fehlt dir etwas oder stimmt etwas nicht, sag es im\",\n      forum: \"Forum\",\n      notTranslated: \"Dieses Kapitel ist noch nicht in deine Sprache übersetzt. Es folgt der englische Text.\",\n      languageMenu: \"Sprache\",\n      search: \"Anleitung durchsuchen\",\n      searchNothing: \"Nichts gefunden.\",\n    },",
    replace: "  de: {\n    // Slovenščina v mestu nemščine: notranja oznaka jezika ostane \"de\".\n    name: \"Slovenščina\",\n    htmlLang: \"sl\",\n    numberLocale: \"sl-SI\",\n    quotes: [\"„\", \"“\"],\n    guideDir: \"navodila\",\n    communityUrl: GITHUB_DISCUSSIONS,\n    readme: \"README.md\",\n    quickstartAnchor: \"windows-quickstart\",\n    legal: { imprint: \"Odtis\", privacy: \"Zasebnost\" },\n    keyNames: { Click: \"Klik\", RightClick: \"Desni klik\", Drag: \"Vlečenje\" },\n    asciiUmlauts: false,\n    complete: false,\n    guide: {\n      site: \"layerling navodila\",\n      home: \"Navodila\",\n      openEditor: \"V urejevalnik\",\n      backToEditor: \"Nazaj v urejevalnik\",\n      editorElsewhere: \"Urejevalnik je že odprt v drugem zavihku – preprosto preklopi nanj.\",\n      chapters: \"Poglavja\",\n      onThisPage: \"Na tej strani\",\n      previous: \"Prejšnje poglavje\",\n      next: \"Naslednje poglavje\",\n      overviewLead: \"Vse, kar zmore layerling, korak za korakom. Slike so posnete iz delujočega programa (v angleškem vmesniku).\",\n      sourceNote: \"Ta navodila rastejo skupaj s programom. Če kaj manjka ali ne drži, sporoči v\",\n      forum: \"razpravah\",\n      notTranslated: \"To poglavje še ni prevedeno v tvoj jezik. Sledi angleško besedilo.\",\n      languageMenu: \"Jezik\",\n      search: \"Išči po navodilih\",\n      searchNothing: \"Nič ni najdeno.\",\n    },",
  },
  {
    name: "Slovenščina: jezik brskalnika sl -> notranja oznaka de",
    stage: "jezik",
    file: "apps/web/src/lib/languages.ts",
    marker: 'primary === "sl"',
    find: "  return isLanguage(primary) ? primary : null;",
    replace: '  const mapped = primary === "sl" ? "de" : primary === "de" ? "en" : primary;\n  return isLanguage(mapped) ? mapped : null;',
  },
  {
    name: "Slovenščina: oznaka SL v preklopniku",
    stage: "jezik",
    file: "apps/web/src/components/LanguageSwitch.tsx",
    marker: '"SL"',
    find: "<span className=\"theme-switch-label\">{language.toUpperCase()}</span>",
    replace: '<span className="theme-switch-label">{language === "de" ? "SL" : language.toUpperCase()}</span>',
  },
  {
    name: "Slovenščina: oznaka jezika v seznamu",
    stage: "jezik",
    file: "apps/web/src/components/LanguageSwitch.tsx",
    marker: 'lang={option === "de" ? "sl"',
    find: "                lang={option}",
    replace: '                lang={option === "de" ? "sl" : option}',
  },
  {
    name: "Slovenščina: skriti uvodni odstavek (lang)",
    stage: "jezik",
    file: "apps/web/src/app/page.tsx",
    marker: '<section lang="sl">',
    find: '<section lang="de">',
    replace: '<section lang="sl">',
  },
  {
    name: "Slovenščina: uvoz preglednic poglavij vodnika",
    stage: "jezik",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: 'from "@/lib/guideSl"',
    find: 'import type { ShapeKind } from "@/types/layerling";',
    replace: 'import type { ShapeKind } from "@/types/layerling";\nimport { SL_GUIDE_CHAPTERS, SL_GUIDE_SECTIONS } from "@/lib/guideSl";',
  },
  {
    name: "Slovenščina: poti poglavij in razdelkov navodil",
    stage: "jezik",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: "SL_GUIDE_CHAPTERS[page]",
    find: "  const chapterSlug = (GUIDE_CHAPTERS[page] as { en: string } & Partial<Record<Language, string>>)[language] ?? GUIDE_CHAPTERS[page].en;\n  const anchor = target ? (target as { en: string } & Partial<Record<Language, string>>)[language] ?? target.en : null;\n  return `/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : \"\"}`;",
    replace: "  const chapterSlug = language === \"de\" ? SL_GUIDE_CHAPTERS[page] : (GUIDE_CHAPTERS[page] as { en: string } & Partial<Record<Language, string>>)[language] ?? GUIDE_CHAPTERS[page].en;\n  const anchor = target ? (language === \"de\" ? SL_GUIDE_SECTIONS[section as GuideSection] : (target as { en: string } & Partial<Record<Language, string>>)[language] ?? target.en) : null;\n  const base = process.env.NEXT_PUBLIC_LAYERLING_BASE ?? \"\";\n  return `${base}/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : \"\"}`;",
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
];

/** Datoteke, ki jih popravki dodajo. */
export const additions = [
  { stage: "jezik", from: "patches/files/userFonts.ts", to: "apps/web/src/lib/userFonts.ts" },
  { stage: "jezik", from: "patches/files/DesktopVersion.tsx", to: "apps/web/src/components/DesktopVersion.tsx" },
  { from: "patches/files/desktopBridge.ts", to: "apps/web/src/lib/desktopBridge.ts" },
  // Slovenski katalog nadomesti nemškega (notranja oznaka jezika ostane "de").
  { from: "patches/files/podpri.html", to: "apps/web/public/podpri/index.html", stage: "jezik" },
  { from: "patches/files/guideSl.ts", to: "apps/web/src/lib/guideSl.ts", stage: "jezik" },
  { from: "patches/files/messages.de.ts", to: "apps/web/src/lib/messages.de.ts", stage: "jezik" },
  { from: "patches/files/assets/cds-round.png", to: "apps/web/public/assets/cds/cds-round.png", stage: "jezik" },
];

/** `stage`: "osnova" (namizni most, brez jezika), "jezik" (slovenščina) ali neopredeljeno = vse. Testi originalnega programa tečejo po fazi "osnova". */
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
    // Ključi, ki jih je original dodal pozneje in jih slovenski katalog še nima, dobijo angleško besedilo
    // (sicer gradnja vodnika pade na neznanem besedilu vmesnika).
    const enFile = join(root, "apps/web/src/lib/messages.en.ts");
    const deFile = join(root, "apps/web/src/lib/messages.de.ts");
    if (existsSync(enFile) && existsSync(deFile)) {
      const keyLine = /^\s*"([^"]+)":\s*.*,\s*$/gm;
      const de = readFileSync(deFile, "utf8");
      const have = new Set([...de.matchAll(keyLine)].map((m) => m[1]));
      const missing = [...readFileSync(enFile, "utf8").matchAll(keyLine)].filter((m) => !have.has(m[1]));
      if (missing.length) {
        const marker = "} as unknown as Record<MessageKey, string>;";
        writeFileSync(deFile, de.replace(marker, () => missing.map((m) => m[0].replace(/\s+$/, "")).join("\n") + "\n" + marker));
        log(`  neprevedeni ključi (angleško): ${missing.length}`);
      }
    }
  }
  if (wanted({ stage: "jezik" })) {
    // Novosti: prevod za zadnji različici, starejše ostanejo v angleščini (ključ "de" nosi slovenščino).
    const file = join(root, "apps/web/src/lib/whatsNew.json");
    if (existsSync(file)) {
      const sl = JSON.parse(readFileSync(join(projectRoot, "patches/files/whatsNew.sl.json"), "utf8"));
      const data = JSON.parse(readFileSync(file, "utf8"));
      for (const entry of data) {
        const translated = sl[entry.version];
        entry.items.forEach((item, index) => {
          const t = translated && translated.length === entry.items.length ? translated[index] : null;
          item.title.de = t ? t[0] : item.title.en;
          item.body.de = t ? t[1] : item.body.en;
        });
      }
      writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
      log("  prevedene novosti (whatsNew.json)");
    } else problems.push("apps/web/src/lib/whatsNew.json: datoteke ni več");
  }
  if (wanted({ stage: "jezik" })) {
    // Navodila: slovenski prevod nadomesti nemška poglavja (jezik "de"), slike so angleške.
    const docs = join(root, "docs/guide");
    const src = join(projectRoot, "patches/files/guide-sl");
    if (existsSync(docs) && existsSync(src)) {
      const deDir = join(docs, "de");
      mkdirSync(deDir, { recursive: true });
      for (const f of readdirSync(deDir)) if (/\.md$/.test(f)) rmSync(join(deDir, f));
      for (const f of readdirSync(src)) copyFileSync(join(src, f), join(deDir, f));
      const enImg = join(docs, "images/en");
      const deImg = join(docs, "images/de");
      if (existsSync(enImg)) {
        mkdirSync(deImg, { recursive: true });
        for (const f of readdirSync(enImg)) copyFileSync(join(enImg, f), join(deImg, f));
      }
      log("  navodila: slovenska poglavja");
    } else problems.push("docs/guide: mape ni več");
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
