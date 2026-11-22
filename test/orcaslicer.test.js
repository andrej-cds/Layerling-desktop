"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { openInOrcaSlicer, findOrcaSlicer } = require("../desktop/orcaslicer");
const { normalize } = require("../desktop/config");

const fakeSpawn = (calls) => (command, args, options) => {
  calls.push({ command, args, options });
  const child = new EventEmitter();
  child.unref = () => {};
  setImmediate(() => child.emit("spawn"));
  return child;
};

test("nastavitve OrcaSlicerja: privzeto prazno, pot se ohrani in obreže", () => {
  assert.deepStrictEqual(normalize(null, "/d").orcaslicer, { exePath: "" });
  assert.strictEqual(normalize({ orcaslicer: { exePath: " C:\\B\\orca-slicer.exe " } }, "/d").orcaslicer.exePath, "C:\\B\\orca-slicer.exe");
  assert.strictEqual(normalize({ orcaslicer: { exePath: 5 } }, "/d").orcaslicer.exePath, "");
});

test("openInOrcaSlicer: izbrani program, običajna namestitev in napake", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-orca-"));
  const obj = path.join(dir, "model.obj");
  const exe = path.join(dir, "orca-slicer.exe");
  fs.writeFileSync(obj, "o a");
  fs.writeFileSync(exe, "");
  const calls = [];
  assert.strictEqual(await openInOrcaSlicer(obj, exe, { spawnFn: fakeSpawn(calls) }), "");
  assert.deepStrictEqual(calls[0].args, [obj]);
  assert.strictEqual(calls[0].command, exe);
  assert.strictEqual(calls[0].options.detached, true);

  assert.strictEqual(await openInOrcaSlicer(obj, "", { spawnFn: fakeSpawn(calls), find: () => exe }), "");
  assert.strictEqual(calls[1].command, exe);
  assert.match(await openInOrcaSlicer(obj, "", { spawnFn: fakeSpawn(calls), find: () => "" }), /ni najden/);
  assert.match(await openInOrcaSlicer(obj, path.join(dir, "ni.exe"), { spawnFn: fakeSpawn(calls) }), /ni na poti/);
  assert.strictEqual(await openInOrcaSlicer(path.join(dir, "ni.obj"), exe, { spawnFn: fakeSpawn(calls) }), "datoteka ne obstaja");
  assert.strictEqual(await openInOrcaSlicer(path.join(dir, "model.stl"), exe, { spawnFn: fakeSpawn(calls) }), "datoteka ne obstaja");
  assert.strictEqual(calls.length, 2);
});

test("openInOrcaSlicer: na macOS se paket .app odpre z »open -a«", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-orca-"));
  const obj = path.join(dir, "m.obj");
  const app = path.join(dir, "OrcaSlicer.app");
  fs.writeFileSync(obj, "o a");
  fs.mkdirSync(app);
  const calls = [];
  assert.strictEqual(await openInOrcaSlicer(obj, app, { spawnFn: fakeSpawn(calls), platform: "darwin" }), "");
  assert.strictEqual(calls[0].command, "open");
  assert.deepStrictEqual(calls[0].args, ["-a", app, obj]);
});

test("findOrcaSlicer: poišče običajno namestitev v Program Files", () => {
  const found = findOrcaSlicer({ ProgramFiles: "C:\\Program Files" }, "win32", (p) => /OrcaSlicer[\\/]orca-slicer\.exe$/.test(p));
  assert.match(found, /OrcaSlicer/);
  assert.strictEqual(findOrcaSlicer({}, "linux", () => true), "");
});
