"use strict";
// Odpiranje izvoženih datotek STEP v Fusionu.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
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

/** Ime brez diakritičnih in drugih znakov izven ASCII (č → c, ž → z, ostalo → _). */
function asciiName(name) {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  return plain.replace(/[^\x20-\x7e]/g, "_");
}

/**
 * Zaganjalnik in Fusion360.exe dobita pot kot ANSI niz, zato se črka kot č lahko pokvari in datoteke ne najdeta
 * (preizkus z ASCII imenom je deloval, z imenom s č ne). Datoteko z imenom ali potjo izven ASCII zato odpre
 * kopija v začasni mapi z imenom brez posebnih znakov. Vrne pot, ki jo je treba poslati.
 */
function pathForFusion(file, { tmpdir = os.tmpdir(), copy = fs.copyFileSync, log = () => {} } = {}) {
  const resolved = path.resolve(file);
  if (!/[^\x20-\x7e]/.test(resolved)) return resolved;
  const dir = path.join(tmpdir, "layerling-fusion");
  fs.mkdirSync(dir, { recursive: true });
  try {
    // Stare kopije ob vsakem odpiranju pospravimo (obdržimo zadnjih nekaj).
    const old = fs.readdirSync(dir).map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t).slice(10);
    for (const entry of old) fs.rmSync(path.join(dir, entry.n), { force: true });
  } catch {
    // pospravljanje ni nujno
  }
  const target = path.join(dir, asciiName(path.basename(resolved)));
  if (/[^\x20-\x7e]/.test(target)) return resolved; // tudi začasna mapa ima posebne znake: nič ne pomaga
  copy(resolved, target);
  log(`Fusion: ime ima posebne znake, odpiram kopijo ${target}`);
  return target;
}

const FUSION_MCP_URL = "http://127.0.0.1:27182/mcp";

/** Python za Fusion: odpre datoteko STEP kot nov dokument. Pot je zapisana kot niz JSON, zato posebni znaki niso težava. */
function importScript(file) {
  return [
    "import adsk.core, adsk.fusion",
    "app = adsk.core.Application.get()",
    // JSON je veljaven niz v Pythonu; posebne znake zapišemo kot \\uXXXX, da jih prenos besedila ne more pokvariti.
    `path = ${JSON.stringify(path.resolve(file)).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))}`,
    "options = app.importManager.createSTEPImportOptions(path)",
    // Fusion ob zagonu sam odpre prazen »Untitled«. Če je ta še prazen in neshranjen, uvozimo vanj (brez novega
    // dokumenta, brez utripanja oken in brez skoka na domači zaslon); sicer ali ob napaki odpremo nov dokument.
    "doc = None",
    "try:",
    "    active = app.activeDocument",
    "    design = adsk.fusion.Design.cast(active.products.itemByProductType('DesignProductType')) if active else None",
    "    if design and not active.isSaved and active.dataFile is None and design.rootComponent.bRepBodies.count == 0 and design.rootComponent.occurrences.count == 0:",
    "        app.importManager.importToTarget(options, design.rootComponent)",
    "        doc = active",
    "except:",
    "    doc = None",
    "if doc is None:",
    "    doc = app.importManager.importToNewDocument(options)",
    "doc.activate()",
    "print('odprto: ' + doc.name)",
    "def run(context):",
    "    pass",
  ].join("\n");
}

/**
 * Odpre datoteko prek Fusionovega lokalnega strežnika MCP (privzeta vrata 27182; vklopi se v nastavitvah
 * Fusiona). Za razliko od zagona programa z datoteko v ukazni vrstici to deluje, ko je Fusion zagnan in
 * pripravljen, in ne zahteva zagona. Vrže napako, če strežnik ne odgovori ali če uvoz ne uspe.
 */
async function importViaFusionMcp(file, { url = FUSION_MCP_URL, fetchFn = (...args) => globalThis.fetch(...args), timeoutMs = 90000, probeTimeoutMs = 5000 } = {}) {
  const call = async (payload, extraHeaders = {}, limit = timeoutMs) => {
    const response = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...extraHeaders },
      body: JSON.stringify(payload),
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(limit) : undefined,
    });
    if (!response.ok) throw new Error(`Fusion MCP: ${response.status}`);
    const text = await response.text();
    return { response, text };
  };
  const init = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "layerling-desktop", version: "1" } } }, {}, probeTimeoutMs);
  const session = init.response.headers && init.response.headers.get ? init.response.headers.get("MCP-Session-Id") : null;
  const headers = session ? { "MCP-Session-Id": session } : {};
  await call({ jsonrpc: "2.0", method: "notifications/initialized" }, headers).catch(() => undefined);
  const result = await call(
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "fusion_mcp_execute", arguments: { featureType: "script", object: { script: importScript(file) } } } },
    headers,
  );
  let body;
  try {
    body = JSON.parse(result.text);
  } catch {
    // odgovor v obliki SSE: vrstica »data: {...}«
    const line = String(result.text).split(/\r?\n/).find((l) => l.startsWith("data:"));
    body = line ? JSON.parse(line.slice(5)) : {};
  }
  if (body.error) throw new Error(`Fusion MCP: ${body.error.message || "napaka"}`);
  const text = body.result && Array.isArray(body.result.content) ? body.result.content.map((c) => c.text || "").join("") : "";
  if (body.result && body.result.isError) throw new Error(`Fusion MCP: ${text.slice(0, 200) || "napaka"}`);
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // brez strukture: štejemo za uspeh, če ni znaka napake
  }
  if (parsed && parsed.success === false) throw new Error(`Fusion: ${String(parsed.error || parsed.message || "uvoz ni uspel").slice(0, 200)}`);
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
    minColdWaitMs = 30000,
    mcpGraceMs = 60000,
    mcpImport = importViaFusionMcp,
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
  // Prvi poskus je Fusionov strežnik MCP; napaka ni usodna, sledi zagon z datoteko.
  let lastMcpError = "";
  const viaMcp = async ({ quiet = false } = {}) => {
    try {
      await mcpImport(file);
      log(`Fusion: odprto prek strežnika MCP ${path.resolve(file)}`);
      return true;
    } catch (error) {
      lastMcpError = error && error.message ? error.message : String(error);
      if (!quiet) log(`Fusion: MCP ni uspel (${lastMcpError})`);
      return false;
    }
  };
  try {
    const state = getState();
    if (state.running) {
      if (await viaMcp()) return "";
    } else {
      // Hladen zagon: najprej samo program, datoteka pride na vrsto, ko je Fusion pripravljen.
      log(`Fusion: zaganjam ${program}`);
      launch([]);
      const started = Date.now();
      let ready = false;
      while (Date.now() - started < readyTimeoutMs) {
        await wait(pollMs);
        // Strežnik MCP odgovori šele, ko je Fusion zares pripravljen; uvoz tu uspe prvi.
        if (getState().running && (await viaMcp({ quiet: true }))) return "";
        if (getState().ready && Date.now() - started >= mcpGraceMs) {
          ready = true;
          break;
        }
      }
      log(`Fusion: MCP ni odgovoril${lastMcpError ? ` (${lastMcpError})` : ""}; uporabim zaganjalnik`);
      if (ready) {
        // Rezerva brez MCP: naslov okna se pokaže že v prvih sekundah, a Fusion se nalaga še pol minute.
        const left = minColdWaitMs - (Date.now() - started);
        if (left > 0) await wait(left);
        await wait(settleMs);
      } else log("Fusion: ni bilo mogoče ugotoviti, da je pripravljen; datoteka se vseeno pošlje");
    }
    const target = pathForFusion(file, { log });
    log(`Fusion: odpiram ${target}`);
    launch([target]);
    return "";
  } catch (error) {
    return String(error && error.message ? error.message : error);
  }
}

module.exports = { importViaFusionMcp, importScript, asciiName, pathForFusion, isStepFile, openInFusion, findInstalledFusion, findFusionLauncher, fusionState };
