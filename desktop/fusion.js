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
 * Stanje Fusiona prek seznama procesov (Windows): zagnan je, če obstaja proces Fusion360.exe, pripravljen
 * pa, ko ima okno z naslovom oblike »<dokument> - Autodesk Fusion«. Dokler se nalaga, je okno brez dokumenta
 * (npr. samo začetni zaslon), in zaganjalnik datoteko, podano v tem času, zavrže.
 */
function fusionState({ platform = process.platform, run = (cmd, args) => require("node:child_process").execFileSync(cmd, args, { encoding: "utf8", windowsHide: true, timeout: 15000 }) } = {}) {
  if (platform !== "win32") return { running: false, ready: false };
  try {
    const out = run("tasklist", ["/v", "/fo", "csv", "/fi", "IMAGENAME eq Fusion360.exe"]);
    const lines = String(out).split(/\r?\n/).filter((line) => /Fusion360\.exe/i.test(line));
    if (!lines.length) return { running: false, ready: false };
    return { running: true, ready: lines.some((line) => /\s-\sAutodesk Fusion/i.test(line)) };
  } catch {
    return { running: false, ready: false };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Odpre datoteko v Fusionu. Najprej zaganjalnik FusionLauncher.exe, razen če je v nastavitvah izbran drug
 * program (ne Fusion360.exe iz webdeploy). Če zaganjalnika ni, uporabi nastavljeni ali najdeni Fusion360.exe,
 * nazadnje pa privzeti program za .step. Če Fusion še ne teče, ga najprej zažene, počaka, da je pripravljen,
 * in šele nato odpre datoteko (ob hladnem zagonu jo zaganjalnik sicer zavrže). Vrne prazen niz ob uspehu ali
 * sporočilo o napaki.
 */
async function openInFusion(file, exePath, opts = {}) {
  const {
    openPath,
    spawnFn = spawn,
    findFusion = findInstalledFusion,
    findLauncher = findFusionLauncher,
    getState = fusionState,
    wait = sleep,
    readyTimeoutMs = 180000,
    pollMs = 2000,
    settleMs = 4000,
    log = () => {},
  } = opts;
  if (!isStepFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  let program = exePath && fs.existsSync(exePath) && !isWebdeployExe(exePath) ? exePath : "";
  if (!program) program = findLauncher() || "";
  if (!program && exePath && fs.existsSync(exePath)) program = exePath;
  if (!program && exePath) program = findFusion() || ""; // Fusion se je posodobil, shranjena pot ne obstaja več
  if (!program) return openPath ? await openPath(file) : "ni načina odpiranja";

  const launch = (args) => {
    const child = spawnFn(program, args, { detached: true, stdio: "ignore" });
    if (child && typeof child.on === "function") child.on("error", () => undefined);
    if (child && typeof child.unref === "function") child.unref();
  };
  try {
    const target = path.resolve(file);
    const state = getState();
    if (!state.running) {
      // Hladen zagon: najprej samo program, datoteka pride na vrsto, ko je Fusion pripravljen.
      log(`Fusion: zaganjam ${program}`);
      launch([]);
      const started = Date.now();
      let ready = false;
      while (Date.now() - started < readyTimeoutMs) {
        await wait(pollMs);
        if (getState().ready) {
          ready = true;
          break;
        }
      }
      if (ready) await wait(settleMs);
      else log("Fusion: ni bilo mogoče ugotoviti, da je pripravljen; datoteka se vseeno pošlje");
    }
    log(`Fusion: odpiram ${target}`);
    launch([target]);
    return "";
  } catch (error) {
    return String(error && error.message ? error.message : error);
  }
}

module.exports = { isStepFile, openInFusion, findInstalledFusion, findFusionLauncher, fusionState };
