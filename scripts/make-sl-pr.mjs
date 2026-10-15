// Pripravi slovenščino kot predlog (patch) za originalni layerling.
// Uporaba: node scripts/make-sl-pr.mjs <čista kopija originala (git) na želeni različici> <izhodna mapa>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applySlovenian } from "../patches/slovenian.mjs";

const [clone, out] = process.argv.slice(2);
if (!clone || !out) {
  console.error("Uporaba: node scripts/make-sl-pr.mjs <čista kopija originala> <izhodna mapa>");
  process.exit(2);
}
const root = resolve(clone);
const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
if (git("status", "--porcelain").trim()) {
  console.error("Kopija originala ni čista (git status ni prazen).");
  process.exit(1);
}
const problems = applySlovenian({ root, projectRoot, log: () => {} });
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
git("add", "-A");
mkdirSync(resolve(out), { recursive: true });
writeFileSync(resolve(out, "slovenscina.patch"), git("diff", "--cached", "--binary"));
console.log(git("diff", "--cached", "--stat").split("\n").slice(-2).join("\n"));
git("reset", "-q", "--hard");
git("clean", "-fdq");
