"use strict";
// Odpiranje izvoženih datotek (STEP, STL, OBJ, 3MF) v Fusionu.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function isFusionFile(file) {
  return typeof file === "string" && /\.(step|stp|stl|obj|3mf)$/i.test(file);
}

/**
 * Odpre datoteko v Fusionu. Če je nastavljena pot do programa, se zažene ta; sicer jo odpre
 * privzeti program za .step (v Windowsih običajno Fusion, če je tako nastavljen).
 * Vrne prazen niz ob uspehu ali sporočilo o napaki.
 */
async function openInFusion(file, exePath, { openPath, spawnFn = spawn } = {}) {
  if (!isFusionFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  if (exePath) {
    if (!fs.existsSync(exePath)) return `program ne obstaja: ${exePath}`;
    try {
      const child = spawnFn(exePath, [path.resolve(file)], { detached: true, stdio: "ignore" });
      if (child && typeof child.on === "function") child.on("error", () => undefined);
      if (child && typeof child.unref === "function") child.unref();
      return "";
    } catch (error) {
      return String(error && error.message ? error.message : error);
    }
  }
  return openPath ? await openPath(file) : "ni načina odpiranja";
}

module.exports = { isFusionFile, openInFusion };
