"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { STRINGS, tr, setLanguage, getLanguage, normalizeLanguage, languageFromLocale } = require("../desktop/strings");

const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");

test("slovenski in angleški slovar imata enake ključe in enake {oznake}", () => {
  const sl = Object.keys(STRINGS.sl);
  const en = Object.keys(STRINGS.en);
  assert.deepEqual(sl.sort(), en.sort());
  for (const key of sl) assert.equal(placeholders(STRINGS.sl[key]), placeholders(STRINGS.en[key]), key);
});

test("jezik: sistem, veljavnost in prevod z vstavljanjem", () => {
  assert.equal(languageFromLocale("sl"), "sl");
  assert.equal(languageFromLocale("sl-SI"), "sl");
  assert.equal(languageFromLocale("en-US"), "en");
  assert.equal(languageFromLocale("de-DE"), "en");
  assert.equal(normalizeLanguage("de"), null);
  setLanguage("en");
  assert.equal(getLanguage(), "en");
  assert.equal(tr("update.download"), "Download and install");
  assert.equal(tr("update.available", { version: "1.2.3" }), "A new version of Layerling is available: 1.2.3.");
  setLanguage("sl");
  assert.equal(tr("update.download"), "Prenesi in namesti");
  assert.equal(tr("neobstojec.kljuc"), "neobstojec.kljuc");
  setLanguage("neveljaven");
  assert.equal(getLanguage(), "sl");
});
