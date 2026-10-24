"use strict";
// Odpiranje izvoženih datotek STEP v Fusionu.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function isStepFile(file) {
  return typeof file === "string" && /\.(step|stp)$/i.test(file);
}

/**
 * Najde najnovejši Fusion360.exe v mapi webdeploy. Fusion se posodablja v novo mapo (ime je zgoščena
 * vrednost), zato se shranjena pot po posodobitvi ne obstaja več. Vrne prazen niz, če ga ni.
 */
function findInstalledFusion(localAppData = process.env.LOCALAPPDATA) {
  if (!localAppData) return "";
  const root = path.join(localAppData, "Autodesk", "webdeploy", "production");
  let best = { exe: "", time: 0 };
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const exe = path.join(root, entry.name, "Fusion360.exe");
      try {
        const time = fs.statSync(exe).mtimeMs;
        if (time > best.time) best = { exe, time };
      } catch {
        // mapa brez Fusiona (npr. stara ali nedokončana namestitev)
      }
    }
  } catch {
    return "";
  }
  return best.exe;
}

/**
 * Odpre datoteko v Fusionu. Če je nastavljena pot do programa, se zažene ta; sicer jo odpre
 * privzeti program za .step (v Windowsih običajno Fusion, če je tako nastavljen).
 * Vrne prazen niz ob uspehu ali sporočilo o napaki.
 */
async function openInFusion(file, exePath, { openPath, spawnFn = spawn, findFusion = findInstalledFusion } = {}) {
  if (!isStepFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  if (exePath && !fs.existsSync(exePath)) {
    // Fusion se je posodobil in shranjena pot ne obstaja več: poišči novo, sicer uporabi privzeti program.
    exePath = findFusion() || "";
  }
  if (exePath) {
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

module.exports = { isStepFile, openInFusion, findInstalledFusion };
