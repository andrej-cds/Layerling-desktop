"use strict";
// Zrcaljenje projektov na disk: trenutno stanje vsakega projekta kot .lyl datoteka
// in omejeno število starejših verzij. Vse zapisuje atomarno (začasna datoteka + preimenovanje),
// da prekinjeno pisanje nikoli ne uniči zadnje dobre datoteke.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PROJECTS_DIR = "Projekti";
const VERSIONS_DIR = "Kopije";
const INDEX_FILE = ".layerling-zrcalo.json";

/** Ime datoteke, varno na Windows in macOS. */
function safeStem(name, fallback = "Projekt") {
  const cleaned = String(name ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "")
    .slice(0, 100);
  if (!cleaned) return fallback;
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(cleaned) ? `${cleaned}_` : cleaned;
}

function sha1(bytes) {
  return crypto.createHash("sha1").update(bytes).digest("hex");
}

function stamp(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function writeAtomic(target, bytes) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, target);
}

class Mirror {
  constructor(options) {
    this.getOptions = options; // () => { folder, keepVersions, versionGapMin }
    this.now = () => new Date();
  }

  _paths() {
    const { folder } = this.getOptions();
    return {
      root: folder,
      projects: path.join(folder, PROJECTS_DIR),
      versions: path.join(folder, VERSIONS_DIR),
      index: path.join(folder, INDEX_FILE),
    };
  }

  _readIndex() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this._paths().index, "utf8"));
      return parsed && typeof parsed === "object" && parsed.projects ? parsed : { projects: {} };
    } catch {
      return { projects: {} };
    }
  }

  _writeIndex(index) {
    writeAtomic(this._paths().index, Buffer.from(JSON.stringify(index, null, 2)));
  }

  /** Datoteka, pod katero je projekt s tem ID-jem. Dve različni stvari z istim imenom dobita (2), (3) … */
  _fileNameFor(index, id, name) {
    const known = index.projects[id];
    const stem = safeStem(name);
    if (known && known.stem === stem) return known;
    const taken = new Set(Object.entries(index.projects).filter(([other]) => other !== id).map(([, v]) => v.file.toLowerCase()));
    let file = `${stem}.lyl`;
    for (let n = 2; taken.has(file.toLowerCase()); n += 1) file = `${stem} (${n}).lyl`;
    return { stem, file };
  }

  /**
   * Zapiše seznam projektov. Vsak vnos: { id, name, bytes }.
   * Vrne { written, unchanged, failed: [{id, error}] }.
   */
  write(entries) {
    const opts = this.getOptions();
    const paths = this._paths();
    const index = this._readIndex();
    const result = { written: 0, unchanged: 0, failed: [] };
    for (const entry of entries) {
      try {
        if (!entry || typeof entry.id !== "string" || !entry.bytes) throw new Error("neveljaven vnos");
        const bytes = Buffer.from(entry.bytes);
        if (bytes.length < 4) throw new Error("prazna datoteka");
        const digest = sha1(bytes);
        const known = index.projects[entry.id];
        const target = this._fileNameFor(index, entry.id, entry.name);
        const targetPath = path.join(paths.projects, target.file);
        if (known && known.sha1 === digest && known.file === target.file && fs.existsSync(targetPath)) {
          result.unchanged += 1;
          continue;
        }
        writeAtomic(targetPath, bytes);
        // Če se je projekt preimenoval, stara datoteka ne ostane kot dvojnik.
        if (known && known.file !== target.file) {
          fs.rmSync(path.join(paths.projects, known.file), { force: true });
        }
        const writtenAt = this.now();
        const versionInfo = this._maybeKeepVersion(paths, opts, target.stem, bytes, known, writtenAt);
        index.projects[entry.id] = {
          stem: target.stem,
          file: target.file,
          sha1: digest,
          lastVersionAt: versionInfo.lastVersionAt,
        };
        result.written += 1;
      } catch (error) {
        result.failed.push({ id: entry && entry.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    if (result.written > 0) this._writeIndex(index);
    return result;
  }

  _maybeKeepVersion(paths, opts, stem, bytes, known, at) {
    const keep = opts.keepVersions;
    if (!keep || keep < 1) return { lastVersionAt: known ? known.lastVersionAt : null };
    const last = known && known.lastVersionAt ? Date.parse(known.lastVersionAt) : 0;
    const gapMs = opts.versionGapMin * 60 * 1000;
    // Prva verzija projekta se ohrani takoj, nato šele po razmiku.
    if (known && last && at.getTime() - last < gapMs) return { lastVersionAt: known.lastVersionAt };
    const dir = path.join(paths.versions, stem);
    writeAtomic(path.join(dir, `${stem} ${stamp(at)}.lyl`), bytes);
    this._prune(dir, keep);
    return { lastVersionAt: at.toISOString() };
  }

  _prune(dir, keep) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".lyl")).sort();
    } catch {
      return;
    }
    // Imena vsebujejo časovni žig, zato abecedni vrstni red = časovni.
    for (const old of files.slice(0, Math.max(0, files.length - keep))) {
      fs.rmSync(path.join(dir, old), { force: true });
    }
  }

  /** Vsi .lyl v mapi Projekti (za obnovitev). */
  listProjectFiles() {
    try {
      return fs.readdirSync(this._paths().projects)
        .filter((f) => f.toLowerCase().endsWith(".lyl"))
        .map((f) => path.join(this._paths().projects, f));
    } catch {
      return [];
    }
  }
}

module.exports = { Mirror, safeStem, writeAtomic, PROJECTS_DIR, VERSIONS_DIR, INDEX_FILE };
