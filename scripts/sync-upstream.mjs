// Prenese originalno kodo (točno pripeto različico iz upstream.json) v mapo `upstream/`.
// Vsakič začne s čisto kopijo, da stari popravki ali ostanki ne vplivajo na gradnjo.
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { capture, projectRoot, readUpstreamPin, run, upstreamDir } from "./lib.mjs";

export function syncUpstream(ref) {
  const pin = readUpstreamPin();
  const wanted = ref || pin.ref;
  console.log(`Prenašam ${pin.repo} @ ${wanted} …`);
  rmSync(upstreamDir, { recursive: true, force: true });
  const isSha = /^[0-9a-f]{40}$/i.test(wanted);
  if (isSha) {
    run("git", ["init", "-q", upstreamDir]);
    run("git", ["-C", upstreamDir, "remote", "add", "origin", pin.repo]);
    run("git", ["-C", upstreamDir, "fetch", "-q", "--depth", "1", "origin", wanted]);
    run("git", ["-C", upstreamDir, "checkout", "-q", "FETCH_HEAD"]);
  } else {
    run("git", ["clone", "-q", "--depth", "1", "--branch", wanted, pin.repo, upstreamDir]);
  }
  const commit = capture("git", ["-C", upstreamDir, "rev-parse", "HEAD"]);
  writeFileSync(join(upstreamDir, ".pinned-ref"), wanted);
  console.log(`Pripeto na ${commit}`);
  return commit;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("sync-upstream.mjs")) {
  syncUpstream(process.argv[2]);
}
