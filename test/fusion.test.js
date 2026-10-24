"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { isStepFile, openInFusion, findInstalledFusion, findFusionLauncher } = require("../desktop/fusion");
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
  assert.strictEqual(await openInFusion(step, "", { openPath: async (f) => { opened.push(f); return ""; } }), "");
  assert.deepStrictEqual(opened, [step]);

  const exe = path.join(dir, "Fusion360.exe");
  fs.writeFileSync(exe, "");
  const spawned = [];
  const fake = (cmd, args) => { spawned.push([cmd, args]); return { on() {}, unref() {} }; };
  assert.strictEqual(await openInFusion(step, exe, { spawnFn: fake, findLauncher: () => "" }), "");
  assert.deepStrictEqual(spawned, [[exe, [path.resolve(step)]]]);

  assert.notStrictEqual(await openInFusion(path.join(dir, "ni.step"), "", { openPath: async () => "" }), "");

  // Zaganjalnik ima prednost pred Fusion360.exe iz webdeploy (ta datoteke ne odpre); lasten izbran program ima prednost pred obema.
  const launcher = path.join(dir, "FusionLauncher.exe");
  const webdeployExe = path.join(dir, "webdeploy", "production", "abc", "Fusion360.exe");
  fs.mkdirSync(path.dirname(webdeployExe), { recursive: true });
  fs.writeFileSync(webdeployExe, "");
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, webdeployExe, { spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], launcher);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, "", { spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], launcher);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, exe, { spawnFn: fake, findLauncher: () => launcher }), "");
  assert.strictEqual(spawned[0][0], exe);
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, webdeployExe, { spawnFn: fake, findLauncher: () => "" }), "");
  assert.strictEqual(spawned[0][0], webdeployExe);
  // Stara pot (Fusion se je posodobil): uporabi novo ali privzeti program, ne javi napake.
  const stale = path.join(dir, "stara", "Fusion360.exe");
  spawned.length = 0;
  assert.strictEqual(await openInFusion(step, stale, { spawnFn: fake, findLauncher: () => "", findFusion: () => exe }), "");
  assert.deepStrictEqual(spawned, [[exe, [path.resolve(step)]]]);
  opened.length = 0;
  assert.strictEqual(await openInFusion(step, stale, { findLauncher: () => "", findFusion: () => "", openPath: async (f) => { opened.push(f); return ""; } }), "");
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
