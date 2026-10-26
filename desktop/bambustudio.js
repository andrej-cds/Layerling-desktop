"use strict";
// Odpiranje izvoženih datotek STL v programu Bambu Studio (pot do programa lahko izbere uporabnik v nastavitvah).
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function isStlFile(file) {
  return typeof file === "string" && /\.stl$/i.test(file);
}

/** Običajna mesta namestitve; vrne prvo, ki obstaja, ali prazen niz. */
function findBambuStudio(env = process.env, platform = process.platform, exists = fs.existsSync) {
  const candidates = [];
  if (platform === "win32") {
    for (const base of [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs")]) {
      if (base) candidates.push(path.join(base, "Bambu Studio", "bambu-studio.exe"));
    }
  } else if (platform === "darwin") {
    candidates.push("/Applications/BambuStudio.app", "/Applications/Bambu Studio.app");
  }
  return candidates.find((c) => exists(c)) || "";
}

/**
 * Odpre datoteko STL v Bambu Studiu: v izbranem programu, sicer v običajni namestitvi. Vrne prazen niz ob uspehu
 * ali sporočilo o napaki. Na macOS se paket .app odpre z ukazom »open -a«.
 */
async function openInBambuStudio(file, exePath, opts = {}) {
  const { spawnFn = spawn, log = () => {}, platform = process.platform, find = () => findBambuStudio() } = opts;
  if (!isStlFile(file) || !fs.existsSync(file)) return "datoteka ne obstaja";
  let program = typeof exePath === "string" ? exePath.trim() : "";
  if (program && !fs.existsSync(program)) return `Programa Bambu Studio ni na poti ${program}. V nastavitvah izberite njegovo datoteko.`;
  if (!program) program = find();
  if (!program) return "Program Bambu Studio ni najden. V nastavitvah (razdelek Bambu Studio) izberite njegovo datoteko.";
  const useOpen = platform === "darwin" && /\.app\/?$/i.test(program);
  const command = useOpen ? "open" : program;
  const args = useOpen ? ["-a", program, file] : [file];
  try {
    await new Promise((resolve, reject) => {
      const child = spawnFn(command, args, { detached: true, stdio: "ignore" });
      if (!child || typeof child.on !== "function") return resolve();
      child.once("error", reject);
      child.once("spawn", resolve);
      setTimeout(resolve, 400);
      if (typeof child.unref === "function") child.unref();
    });
    log(`Bambu Studio: odprto ${file}`);
    return "";
  } catch (error) {
    return error && error.message ? error.message : String(error);
  }
}

module.exports = { openInBambuStudio, findBambuStudio, isStlFile };
