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
];

/** Datoteke, ki jih popravki dodajo. */
export const additions = [{ from: "patches/files/desktopBridge.ts", to: "apps/web/src/lib/desktopBridge.ts" }];

export function applyPatches(upstreamDir, { log = console.log } = {}) {
  const root = resolve(upstreamDir);
  const projectRoot = resolve(here, "..");
  const problems = [];
  for (const edit of edits) {
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
  for (const add of additions) {
    const from = join(projectRoot, add.from);
    const to = join(root, add.to);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    log(`  dodano: ${add.to}`);
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
