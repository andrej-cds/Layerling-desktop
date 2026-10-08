// Popravki originalnega programa za namizno različico.
//
// Namenoma so majhni in se vežejo na besedilna sidra, ne na številke vrstic, zato preživijo večino
// posodobitev. Če sidra ni več (ali je dvoumno), skripta glasno odpove in pove, katero datoteko je treba pogledati.
//
// Uporaba: node patches/apply.mjs <pot do mape z originalno kodo>
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    name: "Slovenščina: ime jezika",
    stage: "jezik",
    file: "apps/web/src/lib/i18n.ts",
    marker: "Slovenščina",
    find: '  de: "Deutsch",',
    replace: '  de: "Slovenščina",',
  },
  {
    name: "Slovenščina: jezik brskalnika sl -> notranja oznaka de",
    stage: "jezik",
    file: "apps/web/src/lib/i18n.ts",
    marker: 'primary === "sl"',
    find: "  return isLanguage(primary) ? primary : null;",
    replace: '  const mapped = primary === "sl" ? "de" : primary === "de" ? "en" : primary;\n  return isLanguage(mapped) ? mapped : null;',
  },
  {
    name: "Slovenščina: lang atribut",
    stage: "jezik",
    file: "apps/web/src/lib/i18n.ts",
    marker: 'language === "de" ? "sl"',
    find: "    document.documentElement.lang = language;",
    replace: '    document.documentElement.lang = language === "de" ? "sl" : language;',
  },
  {
    name: "Slovenščina: zastava in oznaka v preklopniku",
    stage: "jezik",
    file: "apps/web/src/components/LanguageSwitch.tsx",
    marker: "#005da4",
    find: '        <rect width="5" height="1" y="0" fill="#000000" />\n        <rect width="5" height="1" y="1" fill="#dd0000" />\n        <rect width="5" height="1" y="2" fill="#ffce00" />',
    replace: '        <rect width="5" height="1" y="0" fill="#ffffff" />\n        <rect width="5" height="1" y="1" fill="#005da4" />\n        <rect width="5" height="1" y="2" fill="#ed1c24" />',
  },
  {
    name: "Slovenščina: oznaka SL v preklopniku",
    stage: "jezik",
    file: "apps/web/src/components/LanguageSwitch.tsx",
    marker: '"SL"',
    find: "<span>{option.toUpperCase()}</span>",
    replace: '<span>{option === "de" ? "SL" : option.toUpperCase()}</span>',
  },
  {
    name: "Slovenščina: oblika števil (nastavitve delovnega prostora)",
    stage: "jezik",
    file: "apps/web/src/components/workplane/WorkspaceSettingsModal.tsx",
    marker: '"sl-SI"',
    find: '"de-DE"',
    replace: '"sl-SI"',
  },
  {
    name: "Slovenščina: oblika števil (poenostavitev mreže)",
    stage: "jezik",
    file: "apps/web/src/components/workplane/MeshSimplifyPanel.tsx",
    marker: '"sl-SI"',
    find: '"de-DE"',
    replace: '"sl-SI"',
  },
  {
    name: "Slovenščina: oblika števil (urejevalnik, števila)",
    stage: "jezik",
    file: "apps/web/src/components/LayerlingEditor.tsx",
    marker: 'getLanguage() === "de" ? "sl-SI" : "en-US");',
    find: 'return count.toLocaleString(getLanguage() === "de" ? "de-DE" : "en-US");',
    replace: 'return count.toLocaleString(getLanguage() === "de" ? "sl-SI" : "en-US");',
  },
  {
    name: "Slovenščina: oblika števil (urejevalnik, decimalke)",
    stage: "jezik",
    file: "apps/web/src/components/LayerlingEditor.tsx",
    marker: 'getLanguage() === "de" ? "sl-SI" : "en-US", {',
    find: 'return value.toLocaleString(getLanguage() === "de" ? "de-DE" : "en-US", {',
    replace: 'return value.toLocaleString(getLanguage() === "de" ? "sl-SI" : "en-US", {',
  },
  {
    name: "Slovenščina: povezave v nogi brez nemških strani",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "/blob/main/README.md`;",
    find: '  return `${SOURCE_CODE_URL.replace(/\\/+$/, "")}/blob/main/${language === "de" ? "README.de.md" : "README.md"}`;',
    replace: '  void language;\n  return `${SOURCE_CODE_URL.replace(/\\/+$/, "")}/blob/main/README.md`;',
  },
  {
    name: "Slovenščina: skupnost (GitHub namesto nemškega foruma)",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: "FORUM_URL_UNUSED",
    find: '  return language === "de" ? FORUM_URL : `${SOURCE_CODE_URL.replace(/\\/+$/, "")}/discussions`;',
    replace: '  void language;\n  void FORUM_URL;\n  return `${SOURCE_CODE_URL.replace(/\\/+$/, "")}/discussions`; // FORUM_URL_UNUSED',
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
    name: "Slovenščina: sidro navodil za posodabljanje",
    stage: "jezik",
    file: "apps/web/src/components/AppFooter.tsx",
    marker: '#windows-quickstart`',
    find: '#${language === "de" ? "schnellstart-unter-windows" : "windows-quickstart"}`',
    replace: '#windows-quickstart`',
  },
  {
    name: "Slovenščina: vodnik v angleščini",
    stage: "jezik",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: 'const directory = "guide";',
    find: '  const directory = language === "de" ? "anleitung" : "guide";',
    replace: '  void language;\n  const directory = "guide";',
  },
  {
    name: "Slovenščina: poglavja vodnika v angleščini",
    stage: "jezik",
    file: "apps/web/src/lib/guideLinks.ts",
    marker: "GUIDE_CHAPTERS[page].en",
    find: "GUIDE_CHAPTERS[page][language]}.html${target ? `#${target[language]}` : \"\"}`",
    replace: "GUIDE_CHAPTERS[page].en}.html${target ? `#${target.en}` : \"\"}`",
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
];

/** Datoteke, ki jih popravki dodajo. */
export const additions = [
  { stage: "jezik", from: "patches/files/DesktopVersion.tsx", to: "apps/web/src/components/DesktopVersion.tsx" },
  { from: "patches/files/desktopBridge.ts", to: "apps/web/src/lib/desktopBridge.ts" },
  // Slovenski katalog nadomesti nemškega (notranja oznaka jezika ostane "de").
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
