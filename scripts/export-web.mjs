// Statični spletni izvoz (za navadno spletno gostovanje, npr. Abyss/Apache) s slovenščino in znakom CDS.
//
//   node scripts/export-web.mjs                    -> izvoz za podmapo /layerling  (cassettedeck-service.com/layerling/)
//   node scripts/export-web.mjs --base=/drugo      -> izvoz za drugo podmapo
//   node scripts/export-web.mjs --base=            -> izvoz za koren naslova (brez podmape)
//
// Rezultat: web-export/ (vsebino prekopirajte na strežnik; mapo `store` na strežniku ohranite).
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyPatches } from "../patches/apply.mjs";
import { capture, hasUpstream, projectRoot, readUpstreamPin, run, upstreamDir } from "./lib.mjs";
import { syncUpstream } from "./sync-upstream.mjs";

const baseArg = process.argv.find((a) => a.startsWith("--base="));
const base = baseArg ? baseArg.slice("--base=".length) : "/layerling";

function pinned() {
  try {
    return readFileSync(join(upstreamDir, ".pinned-ref"), "utf8").trim() === readUpstreamPin().ref;
  } catch {
    return false;
  }
}
if (!hasUpstream() || !pinned()) syncUpstream();
try {
  run("git", ["-C", upstreamDir, "checkout", "--", "."]);
} catch {}
applyPatches(upstreamDir, { stage: "osnova" });
applyPatches(upstreamDir, { stage: "jezik" });
if (base) applyPatches(upstreamDir, { stage: "podmapa" });
if (!existsSync(join(upstreamDir, "node_modules"))) run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: upstreamDir });

// Isti koraki kot `npm run export` v originalu, brez preverjanja "/_next/" korena, ki za podmapo ne more držati.
const env = { NEXT_TELEMETRY_DISABLED: "1", ...(base ? { LAYERLING_BASE_PATH: base } : {}) };
const nextBin = join(upstreamDir, "node_modules", "next", "dist", "bin", "next");
run(process.execPath, ["scripts/copy-occt-wasm.mjs"], { cwd: upstreamDir, env });
run(process.execPath, ["scripts/build-guide.mjs"], { cwd: upstreamDir, env });
run(process.execPath, [nextBin, "build", "apps/web"], { cwd: upstreamDir, env: { ...env, STATIC_EXPORT: "true" } });
if (!base) run(process.execPath, ["scripts/verify-static-worker-assets.mjs"], { cwd: upstreamDir, env });
run(process.execPath, ["scripts/generate-service-worker.mjs"], { cwd: upstreamDir, env });
const out = join(projectRoot, "web-export");
rmSync(out, { recursive: true, force: true });
cpSync(join(upstreamDir, "apps", "web", ".next-export"), out, { recursive: true });

// Slike in ikone v originalu so zapisane s potjo, ki se začne pri korenu ("/assets/..."), basePath jih ne zajame.
if (base) {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const pattern = /(["'`(])\/assets\//g;
  let changed = 0;
  for (const file of walk(out).filter((f) => /\.(js|html|txt|css|json|webmanifest|xml)$/.test(f) && !f.endsWith("sw.js"))) {
    const text = readFileSync(file, "utf8");
    const next = text.replace(pattern, (_m, q) => `${q}${base}/assets/`);
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
    }
  }
  console.log(`Poti do /assets/ popravljene v ${changed} datotekah.`);
}
console.log(`Izvoz je v web-export/ (podmapa: ${base || "koren naslova"}).`);
