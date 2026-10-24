"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { importViaFusionMcp, importScript, asciiName, pathForFusion, isStepFile, openInFusion, findInstalledFusion, findFusionLauncher, fusionState } = require("../desktop/fusion");
const { normalize } = require("../desktop/config");

test("prepozna datoteke STEP", () => {
  assert.ok(isStepFile("C:\\a\\skatla.STEP"));
  assert.ok(isStepFile("/x/y.stp"));
  assert.ok(!isStepFile("/x/y.stl"));
  assert.ok(!isStepFile(null));
});

test("nastavitve Fusiona: privzeto izklopljeno, pot se ohrani", () => {
  assert.deepStrictEqual(normalize(null, "/d").fusion, { openAfterStepExport: false, exePath: "" });
  const c = normalize({ fusion: { openAfterStepExport: true, exePath: " C:\\F\\Fusion360.exe " } }, "/d");
  assert.strictEqual(c.fusion.openAfterStepExport, true);
  assert.strictEqual(c.fusion.exePath, "C:\\F\\Fusion360.exe");
});

test("openInFusion: privzeti program, nastavljen program in napake", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-fusion-"));
  const step = path.join(dir, "model.step");
  fs.writeFileSync(step, "ISO-10303-21;");
  const opened = [];
  const up = () => ({ running: true, ready: true });
  assert.strictEqual(await openInFusion(step, "", { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, openPath: async (f) => { opened.push(f); return ""; } }), "");
  assert.deepStrictEqual(opened, [step]);

  const exe = path.join(dir, "Fusion360.exe");
  fs.writeFileSync(exe, "");
  const spawned = [];
  const fake = (cmd, args) => { spawned.push([cmd, args]); return { on() {}, unref() {} }; };
  assert.strictEqual(await openInFusion(step, exe, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => "" }), "");
  assert.deepStrictEqual(spawned, [[exe, [path.resolve(step)]]]);

  assert.notStrictEqual(await openInFusion(path.join(dir, "ni.step"), "", { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, openPath: async () => "" }), "");

  // Zaganjalnik ima prednost pred Fusion360.exe iz webdeploy (ta datoteke ne odpre); lasten izbran program ima prednost pred obema.
  const launcher = path.join(dir, "FusionLauncher.exe");
  const webdeployExe = path.join(dir, "webdeploy", "production", "abc", "Fusion360.exe");
  fs.mkdirSync(path.dirname(webdeployExe), { recursive: true });
  fs.writeFileSync(webdeployExe, "");
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, webdeployExe, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], launcher);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, "", { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], launcher);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, exe, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], exe);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, webdeployExe, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => "" }), "");
  assert.strictEqual(spawned[0][0], webdeployExe);
  // Stara pot (Fusion se je posodobil): uporabi novo ali privzeti program, ne javi napake.
  const stale = path.join(dir, "stara", "Fusion360.exe");
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, stale, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, spawnFn: fake, findLauncher: () => "", findFusion: () => exe }), "");
  assert.deepStrictEqual(spawned, [[exe, [path.resolve(step)]]]);
  opened.length = 0;
  assert.strictEqual(await openInFusion(step, stale, { getState: up, mcpImport: async () => { throw new Error("brez MCP"); }, findLauncher: () => "", findFusion: () => "", openPath: async (f) => { opened.push(f); return ""; } }), "");
  assert.deepStrictEqual(opened, [step]);
});

test("findInstalledFusion: izbere najnovejšo mapo webdeploy", () => {
  const local = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-local-"));
  const prod = path.join(local, "Autodesk", "webdeploy", "production");
  for (const [name, age] of [["aaa", 1000], ["bbb", 0], ["ccc", 2000]]) {
    fs.mkdirSync(path.join(prod, name), { recursive: true });
    if (name === "ccc") continue; // brez exe
    const exe = path.join(prod, name, "Fusion360.exe");
    fs.writeFileSync(exe, "");
    const t = new Date(Date.now() - age * 1000);
    fs.utimesSync(exe, t, t);
  }
  assert.strictEqual(findInstalledFusion(local), path.join(prod, "bbb", "Fusion360.exe"));
  assert.strictEqual(findInstalledFusion(path.join(local, "ni")), "");
});

test("findFusionLauncher: samo mapa z zaganjalnikom in njegovo nastavitveno datoteko", () => {
  const local = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-launch-"));
  const prod = path.join(local, "Autodesk", "webdeploy", "production");
  fs.mkdirSync(path.join(prod, "samo-exe"), { recursive: true });
  fs.writeFileSync(path.join(prod, "samo-exe", "FusionLauncher.exe"), "");
  fs.mkdirSync(path.join(prod, "pravi"), { recursive: true });
  fs.writeFileSync(path.join(prod, "pravi", "FusionLauncher.exe"), "");
  fs.writeFileSync(path.join(prod, "pravi", "FusionLauncher.exe.ini"), "");
  assert.strictEqual(findFusionLauncher(local), path.join(prod, "pravi", "FusionLauncher.exe"));
  assert.strictEqual(findFusionLauncher(path.join(local, "ni")), "");
});

test("fusionState: razbere seznam procesov", () => {
  const run = (out) => () => out;
  const head = '"Image Name","PID","Session Name","Session#","Mem Usage","Status","User Name","CPU Time","Window Title"\r\n';
  assert.deepStrictEqual(fusionState({ platform: "win32", run: run('INFO: No tasks are running which match the specified criteria.\r\n') }), { running: false, ready: false, settled: false });
  assert.deepStrictEqual(fusionState({ platform: "win32", run: run(head + '"Fusion360.exe","1","Console","2","1 K","Running","a","0:01:00","N/A"\r\n') }), { running: true, ready: false, settled: false });
  assert.strictEqual(fusionState({ platform: "win32", run: run(head + '"Fusion360.exe","1","Console","2","1 K","Running","a","0:01:00","Preparing your experience - Autodesk Fusion (Education License)"\r\n') }).settled, false);
  assert.deepStrictEqual(fusionState({ platform: "win32", run: run(head + '"Fusion360.exe","1","Console","2","1 K","Running","a","0:01:00","Untitled - Autodesk Fusion (Education License)"\r\n') }), { running: true, ready: true, settled: true });
  assert.deepStrictEqual(fusionState({ platform: "linux" }), { running: false, ready: false, settled: false });
  assert.deepStrictEqual(fusionState({ platform: "win32", run: () => { throw new Error("x"); } }), { running: false, ready: false, settled: false });
});

test("openInFusion: hladen zagon - najprej program brez datoteke, datoteka ko je Fusion pripravljen", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-cold-"));
  const step = path.join(dir, "model.step");
  fs.writeFileSync(step, "ISO-10303-21;");
  const launcher = path.join(dir, "FusionLauncher.exe");
  fs.writeFileSync(launcher, "");
  const calls = [];
  const fake = (cmd, args) => { calls.push(args.length ? "datoteka" : "zagon"); return { on() {}, unref() {} }; };
  const states = [{ running: false, ready: false }, { running: true, ready: false }, { running: true, ready: false }, { running: true, ready: true }];
  let waits = 0;
  const result = await openInFusion(step, "", {
    spawnFn: fake, findLauncher: () => launcher,
    getState: () => states.shift() || { running: true, ready: true },
    wait: async () => { waits += 1; }, settleMs: 0, pollMs: 0, minColdWaitMs: 0, mcpGraceMs: 0, mcpImport: async () => { throw new Error("brez MCP"); },
  });
  assert.strictEqual(result, "");
  assert.deepStrictEqual(calls, ["zagon", "datoteka"]);
  assert.ok(waits >= 3);

  // Fusion se ne javi kot pripravljen: po izteku časa se datoteka vseeno pošlje.
  calls.length = 0;
  const lines = [];
  assert.strictEqual(await openInFusion(step, "", { spawnFn: fake, findLauncher: () => launcher, getState: () => ({ running: true, ready: false }), mcpImport: async () => { throw new Error("brez MCP"); } , wait: async () => {}, readyTimeoutMs: -1, log: (t) => lines.push(t) }), "");
  assert.deepStrictEqual(calls, ["datoteka"]);
});

test("asciiName in pathForFusion: ime s č odpre kopija z imenom brez posebnih znakov", () => {
  assert.strictEqual(asciiName("Gumb za ključavnico-2.step"), "Gumb za kljucavnico-2.step");
  assert.strictEqual(asciiName("Škatla đ Ž.step"), "Skatla d Z.step");
  assert.strictEqual(asciiName("日本.step"), "__.step");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-ascii-"));
  const plain = path.join(dir, "model.step");
  fs.writeFileSync(plain, "A");
  assert.strictEqual(pathForFusion(plain), plain); // brez posebnih znakov: nespremenjeno

  const special = path.join(dir, "Gumb za ključavnico.step");
  fs.writeFileSync(special, "STEP-DATA");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-tmp-"));
  const out = pathForFusion(special, { tmpdir: tmp });
  assert.strictEqual(out, path.join(tmp, "layerling-fusion", "Gumb za kljucavnico.step"));
  assert.strictEqual(fs.readFileSync(out, "utf8"), "STEP-DATA");
});

test("openInFusion: zaganjalniku pošlje ASCII pot za datoteko s č", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-cc-"));
  const step = path.join(dir, "Čudn gumb.step");
  fs.writeFileSync(step, "X");
  const launcher = path.join(dir, "FusionLauncher.exe");
  fs.writeFileSync(launcher, "");
  const sent = [];
  const fake = (cmd, args) => { sent.push(args[0]); return { on() {}, unref() {} }; };
  assert.strictEqual(await openInFusion(step, "", { spawnFn: fake, findLauncher: () => launcher, getState: () => ({ running: true, ready: true }), mcpImport: async () => { throw new Error("brez MCP"); } }), "");
  assert.ok(!/[^\x20-\x7e]/.test(sent[0]), sent[0]);
  assert.ok(sent[0].endsWith("Cudn gumb.step"));
});

test("importScript: pot s posebnimi znaki je zapisana varno", () => {
  const script = importScript(path.join(os.tmpdir(), "Gumb za ključavnico.step"));
  assert.ok(!/[^\x20-\x7e\n]/.test(script), "skript ima samo ASCII");
  assert.ok(script.includes("\\u010d"));
  assert.ok(script.includes("importToNewDocument"));
});

function fakeFusion(responses) {
  const calls = [];
  const fetchFn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const r = responses(body);
    return { ok: r.ok !== false, status: r.status || 200, headers: { get: (n) => (/session/i.test(n) ? "sid-1" : null) }, text: async () => r.text ?? "" };
  };
  return { fetchFn, calls };
}

test("importViaFusionMcp: seja, klic skripta, uspeh in napake", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-mcp-"));
  const step = path.join(dir, "a.step");
  fs.writeFileSync(step, "X");
  const ok = fakeFusion((b) => (b.method === "tools/call" ? { text: JSON.stringify({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: JSON.stringify({ success: true, message: "odprto: a" }) }] } }) } : { text: "{}" }));
  await importViaFusionMcp(step, { fetchFn: ok.fetchFn });
  assert.deepStrictEqual(ok.calls.map((c) => c.method), ["initialize", "notifications/initialized", "tools/call"]);
  assert.strictEqual(ok.calls[2].params.name, "fusion_mcp_execute");
  assert.strictEqual(ok.calls[2].params.arguments.featureType, "script");

  const bad = fakeFusion((b) => (b.method === "tools/call" ? { text: JSON.stringify({ result: { content: [{ type: "text", text: JSON.stringify({ success: false, error: "uvoz ni uspel" }) }] } }) } : { text: "{}" }));
  await assert.rejects(() => importViaFusionMcp(step, { fetchFn: bad.fetchFn }), /uvoz ni uspel/);
  const down = async () => { throw new Error("ECONNREFUSED"); };
  await assert.rejects(() => importViaFusionMcp(step, { fetchFn: down }), /ECONNREFUSED/);
});

test("openInFusion: Fusion teče - uvoz prek MCP, brez zagona programa", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-mcp2-"));
  const step = path.join(dir, "Čudn.step");
  fs.writeFileSync(step, "X");
  const launcher = path.join(dir, "FusionLauncher.exe");
  fs.writeFileSync(launcher, "");
  const spawned = [];
  const fake = () => { spawned.push(1); return { on() {}, unref() {} }; };
  const imported = [];
  assert.strictEqual(await openInFusion(step, "", { spawnFn: fake, findLauncher: () => launcher, getState: () => ({ running: true, ready: true }), mcpImport: async (f) => { imported.push(f); } }), "");
  assert.deepStrictEqual(imported, [step]);
  assert.strictEqual(spawned.length, 0);
});

test("openInFusion: hladen zagon - najprej program, uvoz prek MCP, ko Fusion odgovori", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-mcp3-"));
  const step = path.join(dir, "model.step");
  fs.writeFileSync(step, "X");
  const launcher = path.join(dir, "FusionLauncher.exe");
  fs.writeFileSync(launcher, "");
  const spawnedArgs = [];
  const fake = (cmd, args) => { spawnedArgs.push(args); return { on() {}, unref() {} }; };
  let attempts = 0;
  const states = [{ running: false, ready: false }];
  assert.strictEqual(await openInFusion(step, "", {
    spawnFn: fake, findLauncher: () => launcher,
    getState: () => states.shift() || { running: true, ready: false },
    mcpImport: async () => { attempts += 1; if (attempts < 3) throw new Error("še ne"); },
    wait: async () => {}, pollMs: 0,
  }), "");
  assert.strictEqual(attempts, 4); // 3 poskusi uvoza + ponovna postavitev v ospredje
  assert.deepStrictEqual(spawnedArgs, [[]]); // samo zagon, brez datoteke
});
