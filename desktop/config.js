"use strict";
// Nastavitve programa. Shranjene so kot JSON v uporabniški mapi (userData), zato preživijo posodobitve.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_PORT = 47615;
const GRAPHICS_MODES = ["auto", "gpu", "nographite", "software"];

function defaults(documentsDir) {
  return {
    port: DEFAULT_PORT,
    autosave: {
      enabled: true,
      // Kako pogosto (v sekundah) program preveri spremembe in jih zapiše na disk.
      intervalSec: 30,
      // Mapa za samodejno shranjene projekte (.lyl) in zadnje verzije.
      folder: path.join(documentsDir, "Layerling"),
      // Koliko starejših verzij vsakega projekta se ohrani.
      keepVersions: 10,
      // Najkrajši razmik med dvema ohranjenima verzijama istega projekta (minute).
      versionGapMin: 10,
    },
    // Skupna mapa za deljenje projektov (npr. iCloud Drive). null = izklopljeno.
    sharedFolder: null,
    // Žeton za povezavo z AI odjemalcem (MCP). Ustvari se ob prvem zagonu.
    mcpToken: null,
    checkUpdatesOnStart: true,
    // Način izrisa 3D: auto | gpu | nographite | software (uveljavi se ob ponovnem zagonu).
    graphicsMode: "auto",
    windowBounds: null,
  };
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/** Vrne veljavne nastavitve; kar manjka ali je neveljavno, se nadomesti s privzetim. */
function normalize(raw, documentsDir) {
  const base = defaults(documentsDir);
  const input = raw && typeof raw === "object" ? raw : {};
  const autosave = input.autosave && typeof input.autosave === "object" ? input.autosave : {};
  const folder = typeof autosave.folder === "string" && autosave.folder.trim() ? autosave.folder.trim() : base.autosave.folder;
  const token = typeof input.mcpToken === "string" && input.mcpToken.length >= 16 ? input.mcpToken : crypto.randomBytes(24).toString("hex");
  return {
    port: clamp(input.port, 1024, 65535, base.port),
    autosave: {
      enabled: autosave.enabled !== false,
      intervalSec: clamp(autosave.intervalSec, 5, 3600, base.autosave.intervalSec),
      folder,
      keepVersions: clamp(autosave.keepVersions, 0, 200, base.autosave.keepVersions),
      versionGapMin: clamp(autosave.versionGapMin, 1, 1440, base.autosave.versionGapMin),
    },
    sharedFolder: typeof input.sharedFolder === "string" && input.sharedFolder.trim() ? input.sharedFolder.trim() : null,
    mcpToken: token,
    // Jezik lupine (sl | en): sporoči ga urejevalnik; dokler ni znan, se uporabi jezik sistema.
    language: input.language === "en" || input.language === "sl" ? input.language : null,
    checkUpdatesOnStart: input.checkUpdatesOnStart !== false,
    graphicsMode: GRAPHICS_MODES.includes(input.graphicsMode) ? input.graphicsMode : "auto",
    windowBounds: input.windowBounds && typeof input.windowBounds === "object" ? input.windowBounds : null,
  };
}

class ConfigStore {
  constructor(filePath, documentsDir) {
    this.filePath = filePath;
    this.documentsDir = documentsDir;
    let raw = null;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      raw = null;
    }
    this.data = normalize(raw, documentsDir);
    this.save();
  }

  get() {
    return this.data;
  }

  /** Združi spremembe s trenutnimi nastavitvami, preveri in shrani. */
  update(patch) {
    const merged = {
      ...this.data,
      ...patch,
      autosave: { ...this.data.autosave, ...(patch && patch.autosave ? patch.autosave : {}) },
    };
    this.data = normalize(merged, this.documentsDir);
    this.save();
    return this.data;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (error) {
      console.error("Nastavitev ni bilo mogoče shraniti:", error);
    }
  }
}

module.exports = { ConfigStore, normalize, defaults, DEFAULT_PORT };
