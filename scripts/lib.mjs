import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const upstreamDir = join(projectRoot, "upstream");
export const webDist = join(projectRoot, "web-dist");

export function readUpstreamPin() {
  return JSON.parse(readFileSync(join(projectRoot, "upstream.json"), "utf8"));
}

/** Požene ukaz in ob napaki ustavi skripto. `npm` je na Windows .cmd, zato shell. */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Ukaz ni uspel (${result.status}): ${command} ${args.join(" ")}`);
  }
}

export function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform === "win32", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Ukaz ni uspel (${result.status}): ${command} ${args.join(" ")}\n${result.stderr}`);
  return result.stdout.trim();
}

export const hasUpstream = () => existsSync(join(upstreamDir, "package.json"));

/** Naša različica izdaje (najnovejša datoteka v release-notes/), za prikaz v nogi programa. */
export function ourVersion() {
  const names = readdirSync(join(projectRoot, "release-notes"))
    .map((n) => /^v(\d+)\.(\d+)\.(\d+)\.md$/.exec(n))
    .filter(Boolean)
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return names.length ? names[names.length - 1].join(".") : "";
}
