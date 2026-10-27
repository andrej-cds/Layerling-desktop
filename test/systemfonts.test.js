"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readFontNames, scanSystemFonts, createSystemFonts, systemFontDirs } = require("../desktop/systemfonts");

const sample = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf"].find((f) => fs.existsSync(f));

// Najmanjša veljavna glava pisave z eno tabelo `name`, da test ne zahteva nameščenih pisav.
function tinyFont(family, style, full, ps) {
  const strings = [[1, family], [2, style], [4, full], [6, ps]];
  const encoded = strings.map(([, text]) => { const b = Buffer.from(text, "utf16le"); b.swap16(); return b; });
  const header = 6 + strings.length * 12;
  const name = Buffer.alloc(header + encoded.reduce((n, b) => n + b.length, 0));
  name.writeUInt16BE(0, 0);
  name.writeUInt16BE(strings.length, 2);
  name.writeUInt16BE(header, 4);
  let at = 0;
  strings.forEach(([id], i) => {
    const rec = 6 + i * 12;
    name.writeUInt16BE(3, rec); name.writeUInt16BE(1, rec + 2); name.writeUInt16BE(0x409, rec + 4);
    name.writeUInt16BE(id, rec + 6); name.writeUInt16BE(encoded[i].length, rec + 8); name.writeUInt16BE(at, rec + 10);
    encoded[i].copy(name, header + at); at += encoded[i].length;
  });
  const head = Buffer.alloc(12 + 16);
  head.write("OTTO", 0, "latin1"); head.writeUInt16BE(1, 4);
  head.write("name", 12, "latin1"); head.writeUInt32BE(28, 20); head.writeUInt32BE(name.length, 24);
  return Buffer.concat([head, name]);
}

test("readFontNames: prebere imena iz tabele name in zavrne datoteke, ki niso pisave", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-sysfonts-"));
  const good = path.join(dir, "a.otf");
  fs.writeFileSync(good, tinyFont("Moja Pisava", "Bold", "Moja Pisava Bold", "MojaPisava-Bold"));
  assert.deepStrictEqual(readFontNames(good), { family: "Moja Pisava", style: "Bold", fullName: "Moja Pisava Bold", postscriptName: "MojaPisava-Bold" });
  const bad = path.join(dir, "b.ttf");
  fs.writeFileSync(bad, "to ni pisava");
  assert.strictEqual(readFontNames(bad), null);
  assert.strictEqual(readFontNames(path.join(dir, "ni.ttf")), null);
});

test("scanSystemFonts in createSystemFonts: urejen seznam brez dvojnikov, branje samo za pisave s seznama", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lyl-sysfonts-"));
  fs.mkdirSync(path.join(dir, "pod"));
  fs.writeFileSync(path.join(dir, "b.ttf"), tinyFont("Beta", "Regular", "Beta", "Beta"));
  fs.writeFileSync(path.join(dir, "pod", "a.otf"), tinyFont("Alfa", "Regular", "Alfa", "Alfa"));
  fs.writeFileSync(path.join(dir, "pod", "a-kopija.ttf"), tinyFont("Alfa", "Regular", "Alfa", "Alfa"));
  fs.writeFileSync(path.join(dir, "x.txt"), "x");
  const list = scanSystemFonts([dir]);
  assert.deepStrictEqual(list.map((f) => f.fullName), ["Alfa", "Beta"]);

  const fonts = createSystemFonts({ dirs: [dir] });
  const shown = fonts.list();
  assert.deepStrictEqual(shown.map((f) => [f.id, f.fullName]), [[0, "Alfa"], [1, "Beta"]]);
  assert.ok(!("file" in shown[0]), "pot do datoteke ne sme v prikaz");
  assert.ok(fonts.read(1).length > 0);
  assert.strictEqual(fonts.read(7), null);
  assert.strictEqual(fonts.read("../x"), null);
  assert.strictEqual(fonts.read(-1), null);
});

test("systemFontDirs: mape za Windows, Mac in Linux", () => {
  assert.deepStrictEqual(systemFontDirs("win32", { WINDIR: "C:\\Windows", LOCALAPPDATA: "C:\\U\\L" }, "C:\\U"), [path.join("C:\\Windows", "Fonts"), path.join("C:\\U\\L", "Microsoft", "Windows", "Fonts")]);
  assert.ok(systemFontDirs("darwin", {}, "/Users/a").includes("/Library/Fonts"));
  assert.ok(systemFontDirs("linux", {}, "/home/a").includes("/usr/share/fonts"));
});

test("pravi sistemski pisavi: DejaVu/Arial se prebere", { skip: !sample }, () => {
  const names = readFontNames(sample);
  assert.ok(names && names.family && names.fullName);
});
