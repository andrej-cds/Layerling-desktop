// Preveri, ali je izšla novejša različica originalnega programa, in jo po potrebi pripne.
//
//   node scripts/update-upstream.mjs --check      samo preveri (izpis za GitHub Actions)
//   node scripts/update-upstream.mjs              pripne najnovejšo različico in jo preizkusi (popravki, tipi, testi, gradnja)
//   node scripts/update-upstream.mjs --to v1.50.0 pripne točno to različico
//
// Če kaj od tega ne uspe, se upstream.json vrne na prejšnjo različico.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { capture, projectRoot, readUpstreamPin, run } from "./lib.mjs";

const args = process.argv.slice(2);
const toIndex = args.indexOf("--to");
const wanted = toIndex >= 0 ? args[toIndex + 1] : null;

const semver = (tag) => tag.replace(/^v/, "").split(".").map(Number);
function compare(a, b) {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

const pin = readUpstreamPin();
const tags = capture("git", ["ls-remote", "--tags", "--refs", pin.repo])
  .split("\n")
  .map((line) => line.split("refs/tags/")[1])
  .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag || ""))
  .sort(compare);
if (!tags.length) throw new Error("Pri originalnem programu ni najdenih oznak različic.");
const latest = tags[tags.length - 1];
const newer = compare(latest, pin.ref) > 0;
console.log(`Pripeta različica: ${pin.ref}; najnovejša: ${latest}${newer ? "  → na voljo je novejša" : ""}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `current=${pin.ref}\nlatest=${latest}\nnewer=${newer}\n`);
}
if (args.includes("--check")) process.exit(0);

const target = wanted || latest;
if (!wanted && !newer) {
  console.log("Že imate najnovejšo različico, ni česa posodobiti.");
  process.exit(0);
}

const pinFile = join(projectRoot, "upstream.json");
const before = readFileSync(pinFile, "utf8");
try {
  writeFileSync(pinFile, JSON.stringify({ ...pin, ref: target }, null, 2) + "\n");
  console.log(`\nPreizkušam ${target}: popravki, preverjanje tipov, testi originalnega programa in gradnja …\n`);
  run(process.execPath, [join("scripts", "build-web.mjs"), "--fresh", "--test"], { cwd: projectRoot });
  console.log(`\nUSPELO: ${target} je pripeta in zgrajena.`);
  console.log("Naslednji korak: preizkusite program (npm start), nato izdajte novo različico (glejte README → Izdaja).");
} catch (error) {
  writeFileSync(pinFile, before);
  console.error(`\nNEUSPEŠNO: ${error.message}`);
  console.error("upstream.json je vrnjen na prejšnjo različico. Če se je spremenila originalna koda, ki jo popravki spreminjajo,");
  console.error("je treba popravke v patches/apply.mjs uskladiti (sporočilo zgoraj pove, katero datoteko).");
  process.exit(1);
}
