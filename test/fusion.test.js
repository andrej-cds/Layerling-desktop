"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { isFusionFile, openInFusion } = require("../desktop/fusion");
const { normalize } = require("../desktop/config");

test("prepozna datoteke STEP", () => {
  assert.ok(isFusionFile("C:\\a\\skatla.STEP"));
  assert.ok(isFusionFile("/x/y.stp"));
  assert.ok(isFusionFile("/x/y.stl"));
  assert.ok(!isFusionFile("/x/y.png"));
  assert.ok(!isFusionFile(null));
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
  assert.strictEqual(await openInFusion(step, exe, { spawnFn: fake }), "");
  assert.deepStrictEqual(spawned, [[exe, [path.resolve(step)]]]);

  assert.notStrictEqual(await openInFusion(path.join(dir, "ni.step"), "", { openPath: async () => "" }), "");
  assert.notStrictEqual(await openInFusion(step, path.join(dir, "ni.exe"), {}), "");
});
