"use strict";
// Odpiranje izvoženih datotek STEP v programu SolidCraft (pot do programa izbere uporabnik v nastavitvah).
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { isStepFile, pathForFusion } = require("./fusion");

/**
 * Odpre datoteko STEP v izbranem programu. Brez izbranega programa ali če ga na poti ni, ne ugiba (SolidCraft
 * nima zanesljivega privzetega mesta), ampak vrne sporočilo, kaj storiti. Vrne prazen niz ob uspehu ali sporočilo o napaki.
 * Ime datoteke s posebnimi znaki (č, š, ž) program prejme kot kopijo z imenom brez njih, ker stari programi poti ne razberejo.
 */
async function openInSolidcraft(file, exePath, opts = {}) {
  const { spawnFn = spawn, log = () => {}, prepare = (f) => pathForFusion(f, { log }) } = opts;
  if (!isStepFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  const program = typeof exePath === "string" ? exePath.trim() : "";
  if (!program) return "Program SolidCraft ni izbran. V nastavitvah (razdelek SolidCraft) izberite njegovo datoteko .exe.";
  if (!fs.existsSync(program)) return `Programa SolidCraft ni na poti ${program}. V nastavitvah izberite njegovo datoteko .exe.`;
  try {
    const target = prepare(file);
    await new Promise((resolve, reject) => {
      const child = spawnFn(program, [target], { detached: true, stdio: "ignore" });
      if (!child || typeof child.on !== "function") return resolve();
      child.once("error", reject);
      child.once("spawn", resolve);
      // Starejši Electron/Node brez dogodka »spawn«: napake pridejo takoj, sicer štejemo zagon za uspešen.
      setTimeout(resolve, 400);
      if (typeof child.unref === "function") child.unref();
    });
    log(`SolidCraft: odprto ${target}`);
    return "";
  } catch (error) {
    return error && error.message ? error.message : String(error);
  }
}

module.exports = { openInSolidcraft };
