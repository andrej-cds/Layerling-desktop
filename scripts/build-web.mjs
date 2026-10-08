// Zgradi spletni del (originalni program + naši popravki) v mapo `web-dist/`, ki jo Electron zapakira v namestitev.
//
//   node scripts/build-web.mjs            -> uporabi obstoječo mapo upstream/ (če je), sicer jo prenese
//   node scripts/build-web.mjs --fresh    -> vedno znova prenese in zgradi iz čiste kopije
//   node scripts/build-web.mjs --test     -> pred gradnjo požene preverjanje tipov in teste originalnega programa
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { applyPatches } from "../patches/apply.mjs";
import { capture, hasUpstream, projectRoot, readUpstreamPin, run, upstreamDir, webDist } from "./lib.mjs";
import { syncUpstream } from "./sync-upstream.mjs";

const args = new Set(process.argv.slice(2));
const sourceUrl = process.env.NEXT_PUBLIC_SOURCE_CODE_URL || `https://github.com/${process.env.LAYERLING_DESKTOP_REPO || "andrej-cds/layerling-desktop"}`;

// Obstoječa mapa upstream/ se uporabi samo, če je pripeta na isto različico kot upstream.json.
function upstreamMatchesPin() {
  try {
    return readFileSync(join(upstreamDir, ".pinned-ref"), "utf8").trim() === readUpstreamPin().ref;
  } catch {
    return false;
  }
}

let commit;
if (args.has("--fresh") || !hasUpstream() || !upstreamMatchesPin()) commit = syncUpstream();
else commit = capture("git", ["-C", upstreamDir, "rev-parse", "HEAD"]);

// Čisto stanje (popravki se vedno uporabijo znova), da testi originalnega programa tečejo na izvirnem besedilu.
try {
  run("git", ["-C", upstreamDir, "checkout", "--", "."]);
} catch {}

console.log("Uporabljam popravke …");
applyPatches(upstreamDir, { stage: "osnova" });

console.log("Nameščam odvisnosti originalnega programa …");
run("npm", [existsSync(join(upstreamDir, "package-lock.json")) ? "ci" : "install", "--no-audit", "--no-fund"], { cwd: upstreamDir });

if (args.has("--test")) {
  console.log("Preverjam tipe in teste originalnega programa …");
  run("npm", ["run", "typecheck"], { cwd: upstreamDir });
  run("npm", ["test"], { cwd: upstreamDir });
}

console.log("Uporabljam slovenski prevod …");
applyPatches(upstreamDir, { stage: "jezik" });

console.log("Gradim (Next.js, standalone) …");
run("npm", ["run", "build"], {
  cwd: upstreamDir,
  env: {
    LAYERLING_DESKTOP: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SOURCE_CODE_URL: sourceUrl,
  },
});

console.log("Pripravljam web-dist/ …");
const standalone = join(upstreamDir, "apps", "web", ".next", "standalone");
if (!existsSync(join(standalone, "apps", "web", "server.js"))) {
  throw new Error("Next ni ustvaril pričakovanega standalone izhoda (apps/web/server.js).");
}
rmSync(webDist, { recursive: true, force: true });
cpSync(standalone, webDist, { recursive: true, dereference: true });
cpSync(join(upstreamDir, "apps", "web", ".next", "static"), join(webDist, "apps", "web", ".next", "static"), { recursive: true });
cpSync(join(upstreamDir, "apps", "web", "public"), join(webDist, "apps", "web", "public"), { recursive: true });

// Izvorne knjižnice za sharp niso potrebne (slike se ne optimizirajo na strežniku), v paketu pa bi bile za napačen sistem.
for (const name of readdirSync(join(webDist, "node_modules", "@img")).filter((n) => n.startsWith("sharp-") || n.startsWith("sharp"))) {
  rmSync(join(webDist, "node_modules", "@img", name), { recursive: true, force: true });
}
rmSync(join(webDist, "node_modules", "sharp"), { recursive: true, force: true });

// Pomožne datoteke za lupino.
const support = join(webDist, "_desktop");
mkdirSync(join(support, "mcp"), { recursive: true });
cpSync(join(projectRoot, "desktop", "server-runner.js"), join(support, "server-runner.js"));
for (const file of ["layerling-mcp-server.mjs", "layerling-mcp-tools.mjs"]) {
  cpSync(join(upstreamDir, "scripts", file), join(support, "mcp", file));
}
const upstreamPackage = JSON.parse(readFileSync(join(upstreamDir, "package.json"), "utf8"));
writeFileSync(
  join(support, "upstream.json"),
  JSON.stringify({ version: upstreamPackage.version, ref: readUpstreamPin().ref, commit, builtAt: new Date().toISOString() }, null, 2),
);

function size(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? size(full) : statSync(full).size;
  }
  return total;
}
console.log(`Končano: web-dist/ (${Math.round(size(webDist) / 1048576)} MB), osnova ${upstreamPackage.version} @ ${commit.slice(0, 7)}`);
