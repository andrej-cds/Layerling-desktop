"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanReleaseNotes } = require("../desktop/notes");

test("odstrani tehnične vrstice commita in oznake HTML", () => {
  const raw = "<p>Slovenski prevod vmesnika</p>\n\nCo-Authored-By: Claude Sonnet 5.5 &lt;noreply@anthropic.com&gt;\nClaude-Session: https://claude.ai/code/session_x";
  assert.equal(cleanReleaseNotes(raw), "Slovenski prevod vmesnika");
});

test("pretvori entitete, prazen ali neveljaven vnos in omeji dolžino", () => {
  assert.equal(cleanReleaseNotes("a &amp; b"), "a & b");
  assert.equal(cleanReleaseNotes(undefined), "");
  assert.equal(cleanReleaseNotes(null), "");
  assert.equal(cleanReleaseNotes("x".repeat(900)).length, 500);
});
