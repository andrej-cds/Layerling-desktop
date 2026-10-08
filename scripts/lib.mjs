import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
