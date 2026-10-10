// Celoten preizkus v pravem Electronu: zagon, WebGL urejevalnik, MCP, samodejno shranjevanje na disk,
// nastavitve, skupna mapa, odpiranje datotek, obnovitev in shranjevanje ob zaprtju.
//
//   LAYERLING_E2E_SOFTGL=1 xvfb-run -a node test-e2e/e2e.mjs      (na računalniku brez grafične kartice)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright-core";
import { unzipSync } from "fflate";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Če je podan E2E_EXECUTABLE, se preizkusi zapakiran program (kot ga dobi uporabnik), sicer razvojna različica.
const packaged = process.env.E2E_EXECUTABLE ? resolve(process.env.E2E_EXECUTABLE) : null;
const electronBin = packaged || join(projectDir, "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");
const appArgs = packaged ? [] : [projectDir];
const softGl = process.env.LAYERLING_E2E_SOFTGL === "1" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : [];
const PORT = 47615;
const BASE = `http://127.0.0.1:${PORT}`;

const root = mkdtempSync(join(tmpdir(), "lyl-e2e-"));
const dirs = { userData: join(root, "ud"), auto: join(root, "auto"), shared: join(root, "shared"), shared2: join(root, "shared2"), files: join(root, "files"), fonts: join(root, "fonts") };
Object.values(dirs).forEach((d) => mkdirSync(d, { recursive: true }));
// Lastne pisave: ena sistemska pisava se kopira v mapo s pisavami pod drugim imenom.
process.env.LAYERLING_FONTS_DIR = dirs.fonts;
const systemFont = ["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "/usr/share/fonts/TTF/DejaVuSerif-Bold.ttf", "C:/Windows/Fonts/georgiab.ttf", "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"].find((f) => existsSync(f));
if (systemFont) copyFileSync(systemFont, join(dirs.fonts, "Testna pisava.ttf"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function eventually(label, fn, timeoutMs = 30000, stepMs = 500) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await sleep(stepMs);
  }
  throw new Error(`Časovna omejitev: ${label}${last ? ` (${last.message})` : ""}`);
}
let step = 0;
const ok = (text) => console.log(`  ✓ ${++step}. ${text}`);

function writeSettings(patch) {
  const base = {
    port: PORT,
    autosave: { enabled: true, intervalSec: 5, folder: dirs.auto, keepVersions: 3, versionGapMin: 1 },
    sharedFolder: dirs.shared,
    checkUpdatesOnStart: false,
  };
  const file = join(dirs.userData, "settings.json");
  let existing = {};
  try { existing = JSON.parse(readFileSync(file, "utf8")); } catch { /* prvi zagon */ }
  writeFileSync(file, JSON.stringify({ ...existing, ...base, ...patch, autosave: { ...base.autosave, ...(patch?.autosave || {}) } }, null, 2));
}
const token = () => JSON.parse(readFileSync(join(dirs.userData, "settings.json"), "utf8")).mcpToken;

async function launch(extraArgs = []) {
  const app = await electron.launch({
    executablePath: electronBin,
    args: [...appArgs, "--no-sandbox", ...softGl, `--user-data-dir=${dirs.userData}`, ...extraArgs],
    cwd: projectDir,
  });
  const page = await app.firstWindow();
  await page.waitForURL(new RegExp(`127\\.0\\.0\\.1:${PORT}`), { timeout: 60000 });
  await page.waitForLoadState("domcontentloaded");
  await page.getByText("Create new 3D design").first().waitFor({ timeout: 30000 });
  return { app, page };
}

async function menuHas(app, label) {
  return app.evaluate(({ Menu }, wanted) => Menu.getApplicationMenu().items.some((item) => item.label === wanted), label);
}

async function menuClick(app, id) {
  const found = await app.evaluate(({ Menu }, wanted) => {
    const walk = (items) => {
      for (const item of items) {
        if (item.id === wanted && item.click) { item.click(); return true; }
        if (item.submenu && walk(item.submenu.items)) return true;
      }
      return false;
    };
    return walk(Menu.getApplicationMenu().items);
  }, id);
  assert.ok(found, `Menijska postavka "${id}" ne obstaja`);
}

async function mcp(action, params = {}) {
  const { editors } = await (await fetch(`${BASE}/api/layerling-mcp`, { headers: { Authorization: `Bearer ${token()}` } })).json();
  assert.equal(editors.length, 1, "pričakovan je natanko en odprt urejevalnik");
  const response = await fetch(`${BASE}/api/layerling-mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ type: "command", editorNumber: editors[0].editorNumber, action, params, timeoutMs: 20000 }),
  });
  const body = await response.json();
  assert.ok(body.ok, `MCP ${action}: ${JSON.stringify(body).slice(0, 200)}`);
  return body.data;
}

const storedProjects = (page) => page.evaluate(() => JSON.parse(window.localStorage.getItem("layerling.projects") || "[]"));
const lylFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".lyl")) : []);
const lylText = (file) => {
  const entries = unzipSync(new Uint8Array(readFileSync(file)));
  return new TextDecoder().decode(entries["project.json"]);
};

let session = null;
const only = process.env.E2E_ONLY || "";
try {
  // ---------- Seja 1: običajno delo ----------
  if (only !== "2") {
  console.log("Seja 1: zagon, delo, samodejno shranjevanje");
  writeSettings();
  session = await launch();
  let { app, page } = session;
  const outside = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!/^(http:\/\/127\.0\.0\.1|file:|data:|blob:|devtools:)/.test(url)) outside.push(url);
  });
  ok("program se zažene in naloži originalni vmesnik");

  assert.equal(await page.evaluate(() => Boolean(window.layerlingDesktop?.isDesktop)), true);
  ok("most do lupine je na voljo");

  const windowTitle = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());
  assert.match(windowTitle, /^Layerling - Free 3D CAD for 3D printing - Desktop \d+\.\d+\.\d+$/, `naslov okna: ${windowTitle}`);
  ok("naslovna vrstica: »Layerling - Free 3D CAD for 3D printing - Desktop x.y.z« (brez »in your browser«)");

  await page.waitForFunction(() => /Desktop \d+\.\d+\.\d+/.test(document.body.innerText), null, { timeout: 15000 });
  ok("različica lupine je vidna tudi v nogi strani");

  // Slovenščina nadomešča nemščino: preklopnik jezika pokaže SL, vmesnik se prevede in se da vrniti na EN.
  assert.equal(await page.locator(".language-switch button").count(), 2);
  await page.locator(".language-switch button", { hasText: "SL" }).first().click();
  await page.getByText("Ustvari nov 3D projekt").first().waitFor({ timeout: 15000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), "sl");
  ok("slovenski prevod: preklopnik EN/SL in prevedeni vmesnik");
  await eventually("lupina (meni) sledi slovenščini", () => menuHas(app, "Datoteka"), 15000);
  await page.locator(".language-switch button", { hasText: "EN" }).first().click();
  await page.getByText("Create new 3D design").first().waitFor({ timeout: 15000 });
  await eventually("lupina (meni) sledi angleščini", () => menuHas(app, "File"), 15000);
  assert.equal(await menuHas(app, "Datoteka"), false);
  ok("meniji lupine sledijo jeziku urejevalnika (SL ↔ EN)");

  await page.getByText("Create new 3D design").first().click();
  await eventually("urejevalnik se odpre", () => /editor=1/.test(page.url()), 30000);
  await eventually("urejevalnik se registrira za MCP", async () => (await (await fetch(`${BASE}/api/layerling-mcp`, { headers: { Authorization: `Bearer ${token()}` } })).json()).editors.length > 0, 30000);
  ok("3D urejevalnik (WebGL) deluje in je povezan z MCP");

  await mcp("create_shape", { kind: "box", name: "Škatla-E2E", width: 40, depth: 30, height: 20 });
  await mcp("create_shape", { kind: "cylinder", name: "Valj-E2E", x: 50, width: 20, depth: 20, height: 30 });
  ok("MCP ustvari obliki v urejevalniku");

  if (systemFont) {
    assert.deepEqual(await page.evaluate(() => window.layerlingDesktop.listFonts()), ["Testna pisava.ttf"]);
    await mcp("create_shape", { kind: "text", name: "Besedilo-vgrajena", text: "Čaša", font: "Multilanguage", width: 60, depth: 20, height: 5 });
    await mcp("create_shape", { kind: "text", name: "Besedilo-lastna", text: "Čaša", font: "Testna pisava", width: 60, depth: 20, height: 5 });
    const objects = (await mcp("list_objects")).objects;
    const own = objects.find((o) => o.name === "Besedilo-lastna");
    assert.equal(own.settings.font, "Testna pisava", "lastna pisava mora biti shranjena v obliki besedila");
    await mcp("select_objects", { ids: [own.id] });
    const options = await eventually("seznam pisav v urejevalniku lastnosti", async () => {
      const found = await page.evaluate(() => [...document.querySelectorAll("select")].map((s) => [...s.options].map((o) => o.value)).find((v) => v.includes("Multilanguage")));
      return found || null;
    }, 15000);
    assert.deepEqual(options, ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil", "Testna pisava", "__font-manager"]);
    ok("lastna pisava iz mape se naloži in uporabi na besedilu");
  }

  const projectFile = await eventually("projekt se zapiše na disk z obema oblikama", () => {
    const f = lylFiles(join(dirs.auto, "Projekti"))[0];
    if (!f) return null;
    const text = lylText(join(dirs.auto, "Projekti", f));
    return text.includes("Škatla-E2E") && text.includes("Valj-E2E") ? join(dirs.auto, "Projekti", f) : null;
  }, 40000);
  ok(`samodejno shranjevanje: ${projectFile.split(/[\\/]/).pop()} vsebuje obe obliki`);
  assert.ok(existsSync(join(dirs.auto, "Kopije")), "mapa Kopije manjka");
  ok("ohranjena je tudi starejša verzija (mapa Kopije)");

  // Datoteke za naslednje preizkuse.
  const openFile = join(dirs.files, "Odprta datoteka.lyl");
  copyFileSync(projectFile, openFile);

  // ---------- Nastavitve ----------
  await menuClick(app, "settings");
  const settingsPage = await app.waitForEvent("window", { timeout: 15000 });
  await settingsPage.waitForLoadState("domcontentloaded");
  await settingsPage.locator("#as-interval").waitFor();
  await eventually("okno z nastavitvami je v angleščini (jezik urejevalnika)", async () => (await settingsPage.locator("h1").textContent()) === "Settings", 10000);
  assert.equal(await settingsPage.locator("#up-now").textContent(), "Check now");
  assert.equal(await settingsPage.inputValue("#as-interval"), "5");
  assert.equal(await settingsPage.inputValue("#as-folder"), dirs.auto);
  assert.ok((await settingsPage.inputValue("#mcp")).includes("ELECTRON_RUN_AS_NODE"));
  ok("okno z nastavitvami prikaže trenutne vrednosti in MCP nastavitev");

  await settingsPage.fill("#as-interval", "7");
  await settingsPage.click("#save");
  await eventually("nastavitve se shranijo", async () => JSON.parse(readFileSync(join(dirs.userData, "settings.json"), "utf8")).autosave.intervalSec === 7);
  ok("sprememba intervala se shrani");

  // Skupna mapa: zamenjava mape zažene strežnik znova.
  const saved = await settingsPage.evaluate((folder) => window.settingsApi.save({ sharedFolder: folder }), dirs.shared2);
  assert.equal(saved.config.sharedFolder, dirs.shared2);
  await page.waitForURL(new RegExp(`127\\.0\\.0\\.1:${PORT}`), { timeout: 30000 });
  await eventually("strežnik s skupno mapo odgovarja", async () => (await (await fetch(`${BASE}/api/shared-projects`)).json()).enabled === true, 30000);
  ok("skupna mapa se zamenja brez ponovnega zagona programa");

  const bytes = readFileSync(openFile);
  const upload = await fetch(`${BASE}/api/shared-projects?fileName=${encodeURIComponent("Deljen projekt")}`, {
    method: "POST",
    headers: { "If-None-Match": "*", Origin: BASE },
    body: bytes,
  });
  assert.equal(upload.status, 201, `shranjevanje v skupno mapo: ${upload.status}`);
  assert.ok(lylFiles(dirs.shared2).includes("Deljen projekt.lyl"));
  const listing = await (await fetch(`${BASE}/api/shared-projects`)).json();
  assert.equal(listing.projects.length, 1);
  ok("projekt se zapiše v skupno (iCloud) mapo in je viden na seznamu");

  const before = (await storedProjects(page)).length;

  // ---------- Odpiranje datoteke iz operacijskega sistema ----------
  await page.goto(BASE);
  await page.getByText("Create new 3D design").first().waitFor({ timeout: 30000 });
  const second = spawn(electronBin, [...appArgs, openFile, "--no-sandbox", `--user-data-dir=${dirs.userData}`], { stdio: "ignore" });
  await new Promise((r) => second.once("exit", r));
  await eventually("datoteka se odpre v že odprtem oknu", async () => (await storedProjects(page)).length > before && /editor=1/.test(page.url()), 30000);
  ok("dvojni klik na .lyl odpre projekt v obstoječem oknu (ena kopija programa)");

  // ---------- Obnovitev iz samodejnega shranjevanja ----------
  await page.goto(BASE);
  await page.getByText("Create new 3D design").first().waitFor({ timeout: 30000 });
  const countBeforeRestore = (await storedProjects(page)).length;
  await menuClick(app, "restore");
  await eventually("projekti se obnovijo", async () => (await storedProjects(page)).length > countBeforeRestore, 30000);
  ok("obnovitev iz mape samodejnega shranjevanja vrne projekte");

  assert.deepEqual(outside, [], `Program je klical zunanje naslove: ${outside.join(", ")}`);
  ok("med delom ni nobene zahteve na internet");

  await app.close();
  session = null;
  }
  // ---------- Seja 2: shranjevanje ob zaprtju ----------
  console.log("Seja 2: shranjevanje ob zaprtju okna");
  writeSettings({ autosave: { intervalSec: 3600, folder: join(root, "auto2") }, sharedFolder: null });
  session = await launch();
  const app2 = session.app;
  const page = session.page;
  await sleep(7000); // prvi krog (po 5 s) mine, dokler se ne ustvari nič novega
  await page.getByText("Create new 3D design").first().click();
  await eventually("urejevalnik", () => /editor=1/.test(page.url()), 30000);
  await eventually("MCP", async () => (await (await fetch(`${BASE}/api/layerling-mcp`, { headers: { Authorization: `Bearer ${token()}` } })).json()).editors.length > 0, 30000);
  await mcp("create_shape", { kind: "sphere", name: "Krogla-ob-zaprtju", width: 25, depth: 25, height: 25 });
  await sleep(4000); // da urejevalnik zapiše v lastno shrambo
  const auto2 = join(root, "auto2", "Projekti");
  const early = lylFiles(auto2).some((f) => lylText(join(auto2, f)).includes("Krogla-ob-zaprtju"));
  assert.equal(early, false, "krogla ne bi smela biti na disku pred zaprtjem (interval je 1 ura)");
  await app2.close();
  session = null;
  const flushed = lylFiles(auto2).some((f) => lylText(join(auto2, f)).includes("Krogla-ob-zaprtju"));
  assert.ok(flushed, "ob zaprtju okna se zadnje spremembe niso zapisale na disk");
  ok("ob zaprtju okna se neshranjene spremembe zapišejo na disk");

  // ---------- Seja 3: posodobitve ----------
  if (packaged) {
    console.log("Seja 3: obveščanje o posodobitvah (lasten strežnik namesto GitHuba)");
    const http = await import("node:http");
    let feedVersion = "9.9.9";
    const feed = http.createServer((req, res) => {
      if (/latest.*\.yml$/.test(req.url.split("?")[0])) {
        res.setHeader("Content-Type", "text/yaml");
        res.end(`version: ${feedVersion}\nfiles:\n  - url: Layerling-${feedVersion}.AppImage\n    sha512: ${"A".repeat(86)}==\n    size: 1\npath: Layerling-${feedVersion}.AppImage\nsha512: ${"A".repeat(86)}==\nreleaseDate: '2026-10-08T00:00:00.000Z'\n`);
      } else { res.statusCode = 404; res.end(); }
    });
    await new Promise((r) => feed.listen(0, "127.0.0.1", r));
    const feedUrl = `http://127.0.0.1:${feed.address().port}`;
    writeSettings({ autosave: { intervalSec: 30, folder: join(root, "auto3") }, sharedFolder: null });
    process.env.LAYERLING_E2E = "1";
    process.env.APPIMAGE = join(root, "Layerling-preizkus.AppImage"); // samo na Linuxu: updater drugače zavrne neznan paket
    process.env.LAYERLING_UPDATE_FEED = feedUrl;
    session = await launch();
    const app3 = session.app;
    await app3.evaluate(({ dialog }) => {
      globalThis.__dialogs = [];
      dialog.showMessageBox = async (...args) => {
        const options = args[args.length - 1];
        globalThis.__dialogs.push({ message: options.message, buttons: options.buttons });
        return { response: 1 }; // "Pozneje": nič se ne prenese
      };
    });
    await menuClick(app3, "checkUpdates");
    const asked = await eventually("pojavi se vprašanje o posodobitvi", async () => {
      const list = await app3.evaluate(() => globalThis.__dialogs);
      return list.find((d) => /9\.9\.9/.test(d.message));
    }, 30000);
    assert.ok(asked.buttons.length === 2 && /Prenesi|Odpri|Download|Open/.test(asked.buttons[0]) && /Pozneje|Later/.test(asked.buttons[1]));
    ok("nova različica: program vpraša, ali jo želite prenesti (nič se ne zgodi brez potrditve)");

    feedVersion = "0.0.1";
    await app3.evaluate(() => { globalThis.__dialogs.length = 0; });
    await menuClick(app3, "checkUpdates");
    await eventually("sporočilo, da je različica najnovejša", async () => (await app3.evaluate(() => globalThis.__dialogs)).some((d) => /najnovejšo|latest version/.test(d.message)), 30000);
    ok("brez novosti: program to pove");
    await app3.close();
    session = null;
    feed.close();
  }

  console.log(`\nVSE PREIZKUSE JE PRESTAL (${step} preverjanj).`);
} catch (error) {
  console.error("\nPREIZKUS NI USPEL:", error.message);
  process.exitCode = 1;
} finally {
  if (session) await session.app.close().catch(() => {});
}
