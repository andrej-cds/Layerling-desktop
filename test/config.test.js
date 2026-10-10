"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ConfigStore, normalize } = require("../desktop/config");

test("privzete vrednosti in žeton", () => {
  const c = normalize(null, "/docs");
  assert.strictEqual(c.autosave.intervalSec, 30);
  assert.strictEqual(c.autosave.enabled, true);
  assert.ok(c.mcpToken.length >= 16);
  assert.strictEqual(c.sharedFolder, null);
});

test("neveljavne vrednosti se popravijo", () => {
  const c = normalize({ autosave: { intervalSec: 1, keepVersions: 9999 }, port: "abc" }, "/docs");
  assert.strictEqual(c.autosave.intervalSec, 5);
  assert.strictEqual(c.autosave.keepVersions, 200);
  assert.strictEqual(c.port, 47615);
});

test("žeton in nastavitve se ohranijo med zagoni", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lyl-cfg-")), "settings.json");
  const first = new ConfigStore(file, "/docs");
  const token = first.get().mcpToken;
  first.update({ sharedFolder: "/icloud/Layerling", autosave: { intervalSec: 60 } });
  const second = new ConfigStore(file, "/docs");
  assert.strictEqual(second.get().mcpToken, token);
  assert.strictEqual(second.get().sharedFolder, "/icloud/Layerling");
  assert.strictEqual(second.get().autosave.intervalSec, 60);
  assert.strictEqual(second.get().autosave.enabled, true);
});

test("pokvarjena datoteka nastavitev ne podre programa", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lyl-cfg-")), "settings.json");
  fs.writeFileSync(file, "{ ni json");
  const c = new ConfigStore(file, "/docs");
  assert.strictEqual(c.get().autosave.intervalSec, 30);
});

test("jezik lupine: samo sl ali en, sicer ni določen", () => {
  assert.strictEqual(normalize(null, "/docs").language, null);
  assert.strictEqual(normalize({ language: "en" }, "/docs").language, "en");
  assert.strictEqual(normalize({ language: "sl" }, "/docs").language, "sl");
  assert.strictEqual(normalize({ language: "de" }, "/docs").language, null);
});

test("način izrisa: samo znane vrednosti, sicer samodejno", () => {
  const { normalize } = require("../desktop/config");
  assert.equal(normalize({}, "/tmp").graphicsMode, "auto");
  assert.equal(normalize({ graphicsMode: "gpu" }, "/tmp").graphicsMode, "gpu");
  assert.equal(normalize({ graphicsMode: "software" }, "/tmp").graphicsMode, "software");
  assert.equal(normalize({ graphicsMode: "karkoli" }, "/tmp").graphicsMode, "auto");
});
