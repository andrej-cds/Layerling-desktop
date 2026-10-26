"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { openInBambuStudio, findBambuStudio } = require("../desktop/bambustudio");
const { normalize } = require("../desktop/config");

const fakeSpawn = (calls) => (command, args, options) => {
  calls.push({ command, args, options });
  const child = new EventEmitter();
  child.unref = () => {};
  setImmediate(() => child.emit("spawn"));
  return child;
};

test("nastavitve Bambu Studia: privzeto prazno, pot se ohrani in obreže", () => {
  assert.deepStrictEqual(normalize(null, "/d").bambustudio, { exePath: "" });
  assert.strictEqual(normalize({ bambustudio: { exePath: " C:\\B\\bambu-studio.exe " } }, "/d").bambustudio.exePath, "C:\\B\\bambu-studio.exe");
  assert.strictEqual(normalize({ bambustudio: { exePath: 5 } }, "/d").bambustudio.exePath, "");
});

test("openInBambuStudio: izbrani program, običajna namestitev in napake", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-bambu-"));
  const obj = path.join(dir, "model.obj");
  const exe = path.join(dir, "bambu-studio.exe");
  fs.writeFileSync(obj, "o a");
  fs.writeFileSync(exe, "");
  const calls = [];
  assert.strictEqual(await openInBambuStudio(obj, exe, { spawnFn: fakeSpawn(calls) }), "");
  assert.deepStrictEqual(calls[0].args, [obj]);
  assert.strictEqual(calls[0].command, exe);
  assert.strictEqual(calls[0].options.detached, true);

  assert.strictEqual(await openInBambuStudio(obj, "", { spawnFn: fakeSpawn(calls), find: () => exe }), "");
  assert.strictEqual(calls[1].command, exe);
  assert.match(await openInBambuStudio(obj, "", { spawnFn: fakeSpawn(calls), find: () => "" }), /ni najden/);
  assert.match(await openInBambuStudio(obj, path.join(dir, "ni.exe"), { spawnFn: fakeSpawn(calls) }), /ni na poti/);
  assert.strictEqual(await openInBambuStudio(path.join(dir, "ni.obj"), exe, { spawnFn: fakeSpawn(calls) }), "datoteka ne obstaja");
  assert.strictEqual(await openInBambuStudio(path.join(dir, "model.stl"), exe, { spawnFn: fakeSpawn(calls) }), "datoteka ne obstaja");
  assert.strictEqual(calls.length, 2);
});

test("openInBambuStudio: na macOS se paket .app odpre z »open -a«", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-bambu-"));
  const obj = path.join(dir, "m.obj");
  const app = path.join(dir, "BambuStudio.app");
  fs.writeFileSync(obj, "o a");
  fs.mkdirSync(app);
  const calls = [];
  assert.strictEqual(await openInBambuStudio(obj, app, { spawnFn: fakeSpawn(calls), platform: "darwin" }), "");
  assert.strictEqual(calls[0].command, "open");
  assert.deepStrictEqual(calls[0].args, ["-a", app, obj]);
});

test("findBambuStudio: poišče običajno namestitev v Program Files", () => {
  const found = findBambuStudio({ ProgramFiles: "C:\\Program Files" }, "win32", (p) => /Bambu Studio[\\/]bambu-studio\.exe$/.test(p));
  assert.match(found, /Bambu Studio/);
  assert.strictEqual(findBambuStudio({}, "linux", () => true), "");
});
