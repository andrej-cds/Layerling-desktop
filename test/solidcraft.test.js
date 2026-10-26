"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { openInSolidcraft } = require("../desktop/solidcraft");
const { normalize } = require("../desktop/config");

test("nastavitve SolidCrafta: privzeto prazno, pot se ohrani in obreže", () => {
  assert.deepStrictEqual(normalize(null, "/d").solidcraft, { exePath: "" });
  assert.strictEqual(normalize({ solidcraft: { exePath: " C:\\S\\SolidCraft.exe " } }, "/d").solidcraft.exePath, "C:\\S\\SolidCraft.exe");
  assert.strictEqual(normalize({ solidcraft: { exePath: 5 } }, "/d").solidcraft.exePath, "");
});

test("openInSolidcraft: zažene izbrani program z datoteko, brez programa pove, kaj storiti", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-solid-"));
  const step = path.join(dir, "model.step");
  const exe = path.join(dir, "SolidCraft.exe");
  fs.writeFileSync(step, "ISO-10303-21;");
  fs.writeFileSync(exe, "");
  const calls = [];
  const fake = (program, args, options) => {
    calls.push({ program, args, options });
    const child = new EventEmitter();
    child.unref = () => {};
    setImmediate(() => child.emit("spawn"));
    return child;
  };
  assert.strictEqual(await openInSolidcraft(step, exe, { spawnFn: fake }), "");
  assert.deepStrictEqual(calls[0].args, [step]);
  assert.strictEqual(calls[0].program, exe);
  assert.strictEqual(calls[0].options.detached, true);

  assert.match(await openInSolidcraft(step, "", { spawnFn: fake }), /ni izbran/);
  assert.match(await openInSolidcraft(step, path.join(dir, "ni.exe"), { spawnFn: fake }), /ni na poti/);
  assert.strictEqual(await openInSolidcraft(path.join(dir, "ni.step"), exe, { spawnFn: fake }), "datoteka ne obstaja");
  assert.strictEqual(await openInSolidcraft(path.join(dir, "model.stl"), exe, { spawnFn: fake }), "datoteka ne obstaja");
  assert.strictEqual(calls.length, 1);
});

test("openInSolidcraft: napaka pri zagonu se vrne kot sporočilo", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-solid-"));
  const step = path.join(dir, "a.step");
  const exe = path.join(dir, "SolidCraft.exe");
  fs.writeFileSync(step, "x");
  fs.writeFileSync(exe, "");
  const failing = () => {
    const child = new EventEmitter();
    child.unref = () => {};
    setImmediate(() => child.emit("error", new Error("EACCES")));
    return child;
  };
  assert.strictEqual(await openInSolidcraft(step, exe, { spawnFn: failing }), "EACCES");
});
