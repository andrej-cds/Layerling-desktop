"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Mirror, safeStem } = require("../desktop/mirror");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lyl-mirror-"));
}
const bytes = (text) => Buffer.from(`PK\u0003\u0004${text}`);

test("safeStem odstrani nevarne znake in rezervirana imena", () => {
  assert.strictEqual(safeStem('a/b:c*?"<>|d'), "a-b-c------d");
  assert.strictEqual(safeStem("  ...skrit  "), "skrit");
  assert.strictEqual(safeStem("CON"), "CON_");
  assert.strictEqual(safeStem(""), "Projekt");
  assert.strictEqual(safeStem("konec. "), "konec");
});

test("zapiše projekt, nespremenjenega ne zapiše znova", () => {
  const dir = tmp();
  const m = new Mirror(() => ({ folder: dir, keepVersions: 5, versionGapMin: 10 }));
  assert.deepStrictEqual(m.write([{ id: "a", name: "Škatla", bytes: bytes("1") }]).written, 1);
  assert.ok(fs.existsSync(path.join(dir, "Projekti", "Škatla.lyl")));
  const again = m.write([{ id: "a", name: "Škatla", bytes: bytes("1") }]);
  assert.strictEqual(again.written, 0);
  assert.strictEqual(again.unchanged, 1);
});

test("preimenovan projekt ne pusti dvojnika", () => {
  const dir = tmp();
  const m = new Mirror(() => ({ folder: dir, keepVersions: 5, versionGapMin: 10 }));
  m.write([{ id: "a", name: "Staro", bytes: bytes("1") }]);
  m.write([{ id: "a", name: "Novo", bytes: bytes("1") }]);
  assert.deepStrictEqual(fs.readdirSync(path.join(dir, "Projekti")), ["Novo.lyl"]);
});

test("dva projekta z istim imenom dobita različni datoteki", () => {
  const dir = tmp();
  const m = new Mirror(() => ({ folder: dir, keepVersions: 0, versionGapMin: 10 }));
  m.write([{ id: "a", name: "Isto", bytes: bytes("1") }, { id: "b", name: "Isto", bytes: bytes("2") }]);
  assert.deepStrictEqual(fs.readdirSync(path.join(dir, "Projekti")).sort(), ["Isto (2).lyl", "Isto.lyl"]);
});

test("verzije: prva takoj, naslednje po razmiku, stare se brišejo", () => {
  const dir = tmp();
  const m = new Mirror(() => ({ folder: dir, keepVersions: 2, versionGapMin: 10 }));
  let t = new Date("2026-10-08T10:00:00");
  m.now = () => t;
  const versions = () => fs.readdirSync(path.join(dir, "Kopije", "P")).sort();
  m.write([{ id: "a", name: "P", bytes: bytes("1") }]);
  assert.strictEqual(versions().length, 1);
  t = new Date("2026-10-08T10:05:00"); // premalo časa
  m.write([{ id: "a", name: "P", bytes: bytes("2") }]);
  assert.strictEqual(versions().length, 1);
  t = new Date("2026-10-08T10:20:00");
  m.write([{ id: "a", name: "P", bytes: bytes("3") }]);
  assert.strictEqual(versions().length, 2);
  t = new Date("2026-10-08T10:40:00");
  m.write([{ id: "a", name: "P", bytes: bytes("4") }]);
  const left = versions();
  assert.strictEqual(left.length, 2);
  assert.ok(left[0].includes("1020") && left[1].includes("1040"));
  // Trenutna datoteka je vedno najnovejša.
  assert.strictEqual(fs.readFileSync(path.join(dir, "Projekti", "P.lyl"), "utf8"), "PK\u0003\u00044");
});

test("neveljaven vnos se javi, ostali se zapišejo", () => {
  const dir = tmp();
  const m = new Mirror(() => ({ folder: dir, keepVersions: 0, versionGapMin: 10 }));
  const r = m.write([{ id: "x", name: "Prazen", bytes: Buffer.alloc(0) }, { id: "y", name: "Dober", bytes: bytes("1") }]);
  assert.strictEqual(r.written, 1);
  assert.strictEqual(r.failed.length, 1);
  assert.strictEqual(m.listProjectFiles().length, 1);
});
