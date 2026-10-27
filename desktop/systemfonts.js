"use strict";
// Pisave, nameščene v računalniku: namizni program jih ponudi prek istega okna kot »Dodaj pisave iz računalnika«
// (v brskalniku to omogoča samo Chrome/Edge). Iz datotek se prebere samo glava in tabela imen, zato je seznam hiter.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const FONT_FILE = /\.(ttf|otf)$/i;

/** Mape z nameščenimi pisavami za dani sistem. */
function systemFontDirs(platform = process.platform, env = process.env, home = os.homedir()) {
  if (platform === "win32") {
    const windir = env.WINDIR || env.SystemRoot || "C:\\Windows";
    return [path.join(windir, "Fonts"), env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts")].filter(Boolean);
  }
  if (platform === "darwin") {
    return ["/System/Library/Fonts", "/System/Library/Fonts/Supplemental", "/Library/Fonts", path.join(home, "Library", "Fonts")];
  }
  return ["/usr/share/fonts", "/usr/local/share/fonts", path.join(home, ".fonts"), path.join(home, ".local", "share", "fonts")];
}

function decodeName(buffer, platformId) {
  if (platformId === 0 || platformId === 3) {
    const swapped = Buffer.from(buffer);
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  return buffer.toString("latin1");
}

/** Prebere imena pisave (družina, slog, polno ime, ime PostScript) iz tabele `name`; vrne null, če datoteka ni uporabna pisava. */
function readFontNames(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const head = Buffer.alloc(12);
    if (fs.readSync(fd, head, 0, 12, 0) < 12) return null;
    const tag = head.toString("latin1", 0, 4);
    if (tag !== "\0\x01\0\0" && tag !== "OTTO" && tag !== "true") return null; // TTC in drugo se preskoči
    const tableCount = head.readUInt16BE(4);
    const directory = Buffer.alloc(tableCount * 16);
    fs.readSync(fd, directory, 0, directory.length, 12);
    let offset = 0;
    let length = 0;
    for (let i = 0; i < tableCount; i += 1) {
      if (directory.toString("latin1", i * 16, i * 16 + 4) === "name") {
        offset = directory.readUInt32BE(i * 16 + 8);
        length = directory.readUInt32BE(i * 16 + 12);
        break;
      }
    }
    if (!offset || length < 6 || length > 1 << 20) return null;
    const table = Buffer.alloc(length);
    fs.readSync(fd, table, 0, length, offset);
    const count = table.readUInt16BE(2);
    const storage = table.readUInt16BE(4);
    const found = new Map(); // id imena -> { rank, text }
    for (let i = 0; i < count; i += 1) {
      const at = 6 + i * 12;
      if (at + 12 > table.length) break;
      const platformId = table.readUInt16BE(at);
      const languageId = table.readUInt16BE(at + 4);
      const nameId = table.readUInt16BE(at + 6);
      const size = table.readUInt16BE(at + 8);
      const start = storage + table.readUInt16BE(at + 10);
      if (![1, 2, 4, 6].includes(nameId) || start + size > table.length) continue;
      // Prednost: Windows/angleško, nato Unicode, nato Mac.
      const rank = platformId === 3 && languageId === 0x409 ? 3 : platformId === 3 || platformId === 0 ? 2 : platformId === 1 ? 1 : 0;
      if (!rank || (found.get(nameId)?.rank ?? 0) >= rank) continue;
      found.set(nameId, { rank, text: decodeName(table.subarray(start, start + size), platformId).replace(/\0/g, "").trim() });
    }
    const family = found.get(1)?.text || "";
    const style = found.get(2)?.text || "Regular";
    const fullName = found.get(4)?.text || (family ? `${family} ${style}`.trim() : "");
    if (!family && !fullName) return null;
    return { family: family || fullName, style, fullName: fullName || family, postscriptName: found.get(6)?.text || (fullName || family).replace(/\s+/g, "") };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { /* že zaprto */ }
    }
  }
}

function walk(dir, depth, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth > 0) walk(full, depth - 1, out);
    } else if (entry.isFile() && FONT_FILE.test(entry.name)) {
      out.push(full);
    }
  }
}

/** Seznam nameščenih pisav; `id` je mesto v seznamu, datoteko pa pozna samo ta modul. */
function scanSystemFonts(dirs = systemFontDirs()) {
  const files = [];
  for (const dir of dirs) walk(dir, 4, files);
  const fonts = [];
  const seen = new Set();
  for (const file of files) {
    const names = readFontNames(file);
    if (!names || seen.has(names.fullName)) continue;
    seen.add(names.fullName);
    fonts.push({ ...names, file });
  }
  fonts.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return fonts;
}

/** Stanje seznama za IPC: id → datoteka. Branje je mogoče samo za pisave s seznama. */
function createSystemFonts(options = {}) {
  const scan = options.scan || (() => scanSystemFonts(options.dirs));
  const read = options.read || ((file) => fs.readFileSync(file));
  let current = [];
  return {
    list() {
      current = scan();
      return current.map(({ file, ...rest }, id) => ({ id, ...rest }));
    },
    read(id) {
      const font = Number.isInteger(id) ? current[id] : null;
      if (!font) return null;
      try {
        return read(font.file);
      } catch {
        return null;
      }
    },
  };
}

module.exports = { systemFontDirs, readFontNames, scanSystemFonts, createSystemFonts };
