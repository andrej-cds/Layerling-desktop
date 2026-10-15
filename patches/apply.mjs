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
    name: "Velikost: ročaj čez nasprotno stranico nadaljuje na drugi strani (telo)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "resize-prek-nic-telo",
    find: "    if (altKey) {\n      return snapDimension(current + signedDelta * 2, step, MIN_SHAPE_SIZE, maxSize);\n    }\n    return snapDimension(current + signedDelta, step, MIN_SHAPE_SIZE, maxSize);",
    replace: "    // resize-prek-nic-telo: čez 0 se velikost nadaljuje na drugi strani sidra (kot Tinkercad), ne obstane na najmanjši.\n    if (altKey) {\n      return snapDimension(Math.abs(current + signedDelta * 2), step, MIN_SHAPE_SIZE, maxSize);\n    }\n    return snapDimension(Math.abs(current + signedDelta), step, MIN_SHAPE_SIZE, maxSize);",
  },
  {
    name: "Velikost: središče po prestopu čez 0 (telo)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "resize-prek-nic-sredisce",
    find: "    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), signs, nextWidth, nextDepth);",
    replace: "    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), { x: signs.x && width + signs.x * localDelta.x < 0 ? -signs.x : signs.x, z: signs.z && depth + signs.z * localDelta.z < 0 ? -signs.z : signs.z }, nextWidth, nextDepth); // resize-prek-nic-sredisce",
  },
  {
    name: "Velikost: ročaj čez nasprotno stranico nadaljuje na drugi strani (izbor)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "resize-prek-nic-izbor",
    find: "    if (altKey) {\n      const size = snapDimension(current + signedDelta * 2, step, MIN_SHAPE_SIZE, maxSize);\n      return { size, scale: size / Math.max(MIN_SHAPE_SIZE, current) };\n    }\n    const rawSize = current + signedDelta;\n    const size = snapDimension(rawSize, step, MIN_SHAPE_SIZE, maxSize);",
    replace: "    // resize-prek-nic-izbor: enako kot pri enem telesu.\n    if (altKey) {\n      const size = snapDimension(Math.abs(current + signedDelta * 2), step, MIN_SHAPE_SIZE, maxSize);\n      return { size, scale: size / Math.max(MIN_SHAPE_SIZE, current) };\n    }\n    const rawSize = Math.abs(current + signedDelta);\n    const size = snapDimension(rawSize, step, MIN_SHAPE_SIZE, maxSize);",
  },
  {
    name: "Velikost: središče po prestopu čez 0 (izbor)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "resize-prek-nic-sredisce-izbor",
    find: "    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), signs, nextX.size, nextZ.size);",
    replace: "    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), { x: signs.x && frame.width + signs.x * localDelta.x < 0 ? -signs.x : signs.x, z: signs.z && frame.depth + signs.z * localDelta.z < 0 ? -signs.z : signs.z }, nextX.size, nextZ.size); // resize-prek-nic-sredisce-izbor",
  },
  {
    name: "Višina: ročaj čez nasprotno ploskev nadaljuje na drugi strani (poteza)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "visina-prek-nic-poteza",
    find: "        const nextFrameHeight = clamp(\n          upright\n            ? heightWithFaceOnGrid(startLift.low, transform.selectionFrame.height, rawFrameHeight, resizingFromBottom, step)\n            : transform.selectionFrame.height + snapValue(rawFrameHeight - transform.selectionFrame.height, step),\n          MIN_SHAPE_SIZE,\n          maxHeight,\n        );",
    replace: "        // visina-prek-nic-poteza: negativna višina = telo je prestopilo sidro in se nadaljuje na drugi strani.\n        const snappedFrameHeight = upright ? heightWithFaceOnGrid(startLift.low, transform.selectionFrame.height, rawFrameHeight, resizingFromBottom, step) : transform.selectionFrame.height + snapValue(rawFrameHeight - transform.selectionFrame.height, step);\n        const nextFrameHeightMagnitude = clamp(Math.abs(snappedFrameHeight), MIN_SHAPE_SIZE, maxHeight);\n        const nextFrameHeight = snappedFrameHeight < 0 ? -nextFrameHeightMagnitude : nextFrameHeightMagnitude;",
  },
  {
    name: "Višina: uvožena telesa dobijo vedno pozitivno višino",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "visina-prek-nic-uvoz",
    find: "  const importedPatch = resizeImportedShapeAlongFrameNormal(shape, frame, nextFrameHeight, resizingFromBottom);",
    replace: "  const importedPatch = resizeImportedShapeAlongFrameNormal(shape, frame, Math.abs(nextFrameHeight), resizingFromBottom); // visina-prek-nic-uvoz",
  },
  {
    name: "Višina: širina po prestopu čez 0",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "visina-prek-nic-sirina",
    find: "    patch.width = Math.max(MIN_SHAPE_SIZE, shapeWidth(shape) * scale);",
    replace: "    patch.width = Math.max(MIN_SHAPE_SIZE, shapeWidth(shape) * Math.abs(scale)); // visina-prek-nic-sirina",
  },
  {
    name: "Višina: globina po prestopu čez 0",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "visina-prek-nic-globina",
    find: "    patch.depth = Math.max(MIN_SHAPE_SIZE, shapeDepth(shape) * scale);",
    replace: "    patch.depth = Math.max(MIN_SHAPE_SIZE, shapeDepth(shape) * Math.abs(scale)); // visina-prek-nic-globina",
  },
  {
    name: "Višina: višina po prestopu čez 0",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "visina-prek-nic-visina",
    find: "    patch.height = Math.max(MIN_SHAPE_SIZE, shape.height * scale);\n    patch.elevation",
    replace: "    patch.height = Math.max(MIN_SHAPE_SIZE, shape.height * Math.abs(scale)); // visina-prek-nic-visina\n    patch.elevation",
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
    name: "Prerez: uvoz ikon Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "Check, ChevronLeft",
    find: "import { ArrowDownToLine, ChevronLeft,",
    replace: "import { ArrowDownToLine, Check, ChevronLeft,",
  },
  {
    name: "Prerez: uvoz ikone Nazaj",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "Trash2, Undo2, X }",
    find: "Trash2, X } from \"lucide-react\";",
    replace: "Trash2, Undo2, X } from \"lucide-react\";",
  },
  {
    name: "Prerez: gumb Potrdi (Enter) ob Izmeri, za zaslon na dotik",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "section-confirm-btn",
    find: "                            <span className=\"section-measure-help\">{t(\"camera.sectionMeasureHelp\")}</span>\n                          )\n                        ) : null}\n                      </div>",
    replace: "                            <span className=\"section-measure-help\">{t(\"camera.sectionMeasureHelp\")}</span>\n                          )\n                        ) : null}\n                        {/* section-confirm-btn: na zaslonu na dotik ni tipke Enter; gumb potrdi položaj, konča merjenje in zapre ploščo (prerez ostane). */}\n                        <button\n                          type=\"button\"\n                          className=\"section-action-btn section-confirm-btn\"\n                          style={{ marginLeft: \"auto\", height: 36, minHeight: 36, color: \"#fff\", background: \"#c86a12\", borderColor: \"#b05c0e\", fontWeight: 700 }}\n                          onClick={() => {\n                            setSectionMeasureMode(false);\n                            setSectionViewOpen(false);\n                          }}\n                          title={`${t(\"camera.sectionConfirm\")} (Enter)`}\n                          aria-label={t(\"camera.sectionConfirm\")}\n                        >\n                          <Check size={16} strokeWidth={2.6} aria-hidden=\"true\" />\n                          <span>{t(\"camera.sectionConfirm\")}</span>\n                        </button>\n                      </div>",
  },
  {
    name: "Prerez: gumb Nazaj (Esc) ob Delovna ravnina tukaj, za zaslon na dotik",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "section-back-btn",
    find: "                          <span>{t(\"camera.sectionWorkplane\")}</span>\n                        </button>\n                      </div>",
    replace: "                          <span>{t(\"camera.sectionWorkplane\")}</span>\n                        </button>\n                        {/* section-back-btn: na zaslonu na dotik ni tipke Esc; gumb dela kot Esc (najprej konča merjenje, nato zapre ploščo). */}\n                        <button\n                          type=\"button\"\n                          className=\"section-action-btn section-back-btn\"\n                          style={{ marginLeft: \"auto\", height: 36, minHeight: 36, fontWeight: 700 }}\n                          onClick={() => {\n                            if (sectionMeasureModeRef.current) setSectionMeasureMode(false);\n                            else setSectionViewOpen(false);\n                          }}\n                          title={`${t(\"camera.sectionBack\")} (Esc)`}\n                          aria-label={t(\"camera.sectionBack\")}\n                        >\n                          <Undo2 size={16} strokeWidth={2.4} aria-hidden=\"true\" />\n                          <span>{t(\"camera.sectionBack\")}</span>\n                        </button>\n                      </div>",
  },
  {
    name: "Prerez: angleška besedila za gumba Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/lib/messages.en.ts",
    marker: "\"camera.sectionConfirm\"",
    find: "  \"camera.sectionMeasureHelp\":",
    replace: "  \"camera.sectionConfirm\": \"Confirm\",\n  \"camera.sectionBack\": \"Back\",\n  \"camera.sectionMeasureHelp\":",
  },
  {
    name: "Prerez: nizozemska besedila za gumba Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/lib/messages.nl.ts",
    marker: "\"camera.sectionConfirm\"",
    find: "  \"camera.sectionMeasureHelp\":",
    replace: "  \"camera.sectionConfirm\": \"Bevestigen\",\n  \"camera.sectionBack\": \"Terug\",\n  \"camera.sectionMeasureHelp\":",
  },
  {
    name: "Prerez: slovenska besedila za gumba Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/lib/messages.sl.ts",
    marker: "\"camera.sectionConfirm\"",
    find: "  \"camera.sectionMeasureHelp\":",
    replace: "  \"camera.sectionConfirm\": \"Potrdi\",\n  \"camera.sectionBack\": \"Nazaj\",\n  \"camera.sectionMeasureHelp\":",
  },
  {
    name: "Prerez: češka besedila za gumba Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/lib/messages.cs.ts",
    marker: "\"camera.sectionConfirm\"",
    find: "  \"camera.sectionMeasureHelp\":",
    replace: "  \"camera.sectionConfirm\": \"Potvrdit\",\n  \"camera.sectionBack\": \"Zpět\",\n  \"camera.sectionMeasureHelp\":",
  },
  {
    name: "Prerez: nemška besedila za gumba Potrdi in Nazaj",
    stage: "jezik",
    file: "apps/web/src/lib/messages.de.ts",
    marker: "\"camera.sectionConfirm\"",
    find: "  \"camera.sectionMeasureHelp\":",
    replace: "  \"camera.sectionConfirm\": \"Bestätigen\",\n  \"camera.sectionBack\": \"Zurück\",\n  \"camera.sectionMeasureHelp\":",
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
    replace: "// section-izbira: doseg drsnika ostane cel načrt, sredina pa je sredina izbranih objektov (če je kaj izbrano), da ravnina prereže tistega, ki ga izbereš.\nlet sectionSelectionIds: readonly string[] = [];\nfunction getSectionBounds(shapes: WorkplaneShape[], axis: SectionPlaneAxis, workspaceWidth?: number, workspaceDepth?: number) {\n  const all = getSectionBoundsAll(shapes, axis, workspaceWidth, workspaceDepth);\n  if (sectionSelectionIds.length === 0) return all;\n  const picked = shapes.filter((shape) => sectionSelectionIds.includes(shape.id) && !shape.hidden);\n  if (picked.length === 0) return all;\n  return { ...all, center: getSectionBoundsAll(picked, axis, workspaceWidth, workspaceDepth).center };\n}\n\n/** The parts of a measurement that lie in the cutting plane, named like the position fields. */",
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
    name: "Puščica za premik: stalna razdalja nad kocko (konstanta)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "LIFT_HANDLE_FIXED_OFFSET = 6",
    find: "const LIFT_HANDLE_HEIGHT_OFFSET_FRACTION = 0.30;",
    replace: "const LIFT_HANDLE_HEIGHT_OFFSET_FRACTION = 0.30;\n/** lift-stalna-razdalja: razdalja puščice od kocke za višino je stalna (3 x najmanjša prejšnja, 2 mm), ne raste z višino telesa. */\nconst LIFT_HANDLE_FIXED_OFFSET = 6;",
  },
  {
    name: "Puščica za premik: stalna razdalja (vlečenje 1)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "kind === \"lift\" ? LIFT_HANDLE_FIXED_OFFSET",
    find: "const liftOffset = kind === \"lift\" ? Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION)",
    replace: "const liftOffset = kind === \"lift\" ? LIFT_HANDLE_FIXED_OFFSET",
  },
  {
    name: "Puščica za premik: stalna razdalja (vlečenje 2)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "handle.kind === \"lift\" ? LIFT_HANDLE_FIXED_OFFSET",
    find: "const liftOffset = handle.kind === \"lift\" ? Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION)",
    replace: "const liftOffset = handle.kind === \"lift\" ? LIFT_HANDLE_FIXED_OFFSET",
  },
  {
    name: "Puščica za premik: stalna razdalja (prikaz)",
    stage: "jezik",
    file: "apps/web/src/components/WorkplaneViewport.tsx",
    marker: "const liftOffset = LIFT_HANDLE_FIXED_OFFSET;",
    find: "const liftOffset = Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION);",
    replace: "const liftOffset = LIFT_HANDLE_FIXED_OFFSET;",
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
