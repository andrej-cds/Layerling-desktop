"use strict";
// Odpiranje izvoženih datotek STEP v Fusionu.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function isStepFile(file) {
  return typeof file === "string" && /\.(step|stp)$/i.test(file);
}

const isWebdeployExe = (file) => /[\\/]webdeploy[\\/]/i.test(file) && /Fusion360\.exe$/i.test(file);

function webdeployRoot(localAppData) {
  return localAppData ? path.join(localAppData, "Autodesk", "webdeploy", "production") : "";
}

/** Najnovejša datoteka z danim imenom v podmapah webdeploy (po času spremembe); neobvezno samo mape z dodatno datoteko. */
function newestInWebdeploy(localAppData, name, { alsoNeeds } = {}) {
  const root = webdeployRoot(localAppData);
  if (!root) return "";
  let best = { file: "", time: 0 };
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(root, entry.name, name);
      try {
        if (alsoNeeds && !fs.existsSync(path.join(root, entry.name, alsoNeeds))) continue;
        const time = fs.statSync(file).mtimeMs;
        if (time > best.time) best = { file, time };
      } catch {
        // mapa brez te datoteke (npr. stara ali nedokončana namestitev)
      }
    }
  } catch {
    return "";
  }
  return best.file;
}

/**
 * Najde najnovejši Fusion360.exe v mapi webdeploy. Fusion se posodablja v novo mapo (ime je zgoščena
 * vrednost), zato se shranjena pot po posodobitvi ne obstaja več. Vrne prazen niz, če ga ni.
 */
function findInstalledFusion(localAppData = process.env.LOCALAPPDATA) {
  return newestInWebdeploy(localAppData, "Fusion360.exe");
}

/**
 * Najde FusionLauncher.exe, ki ga Fusion sam uporablja za zagon. Za razliko od Fusion360.exe sprejme
 * datoteko kot argument in jo odpre v že odprtem Fusionu (preizkušeno: Fusion360.exe z datoteko samo
 * zažene program, model se ne odpre).
 */
function findFusionLauncher(localAppData = process.env.LOCALAPPDATA) {
  return newestInWebdeploy(localAppData, "FusionLauncher.exe", { alsoNeeds: "FusionLauncher.exe.ini" });
}

/**
 * Odpre datoteko v Fusionu. Najprej zaganjalnik FusionLauncher.exe, razen če je v nastavitvah izbran drug
 * program (ne Fusion360.exe iz webdeploy). Če zaganjalnika ni, uporabi nastavljeni ali najdeni Fusion360.exe,
 * nazadnje pa privzeti program za .step. Vrne prazen niz ob uspehu ali sporočilo o napaki.
 */
async function openInFusion(file, exePath, { openPath, spawnFn = spawn, findFusion = findInstalledFusion, findLauncher = findFusionLauncher } = {}) {
  if (!isStepFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  let program = exePath && fs.existsSync(exePath) && !isWebdeployExe(exePath) ? exePath : "";
  if (!program) program = findLauncher() || "";
  if (!program && exePath && fs.existsSync(exePath)) program = exePath;
  if (!program && exePath) program = findFusion() || ""; // Fusion se je posodobil, shranjena pot ne obstaja več
  if (program) {
    try {
      const child = spawnFn(program, [path.resolve(file)], { detached: true, stdio: "ignore" });
      if (child && typeof child.on === "function") child.on("error", () => undefined);
      if (child && typeof child.unref === "function") child.unref();
      return "";
    } catch (error) {
      return String(error && error.message ? error.message : error);
    }
  }
  return openPath ? await openPath(file) : "ni načina odpiranja";
}

module.exports = { isStepFile, openInFusion, findInstalledFusion, findFusionLauncher };
