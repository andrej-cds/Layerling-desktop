"use strict";
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, session, clipboard, Notification } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { zipSync } = require("fflate");
const { ConfigStore } = require("./config");
const { Mirror } = require("./mirror");
const { EmbeddedServer } = require("./server");
const { buildMenu } = require("./menu");
const { tr, setLanguage, getLanguage, normalizeLanguage, languageFromLocale, STRINGS } = require("./strings");
const { detectICloudFolders, mcpClientConfig } = require("./integrations");
const updater = require("./updater");

const WINDOW_TITLE = "Layerling - Free 3D CAD for 3D printing";
const REPO = (process.env.LAYERLING_DESKTOP_REPO || "andrej-cds/layerling-desktop");
const SOURCE_URL = `https://github.com/${REPO}`;
const UPSTREAM_DOCS_URL = "https://github.com/henmedia/layerling#readme";
const MAX_OPEN_BYTES = 600 * 1024 * 1024;
const isMac = process.platform === "darwin";
const isDev = !app.isPackaged;

// Drugi zagon programa samo preusmeri datoteko v že odprto okno.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const logLines = [];
function log(text) {
  const line = `[${new Date().toISOString()}] ${String(text).trim()}`;
  logLines.push(line);
  if (logLines.length > 400) logLines.shift();
  if (isDev) console.log(line);
  try {
    fs.appendFileSync(path.join(app.getPath("userData"), "layerling.log"), `${line}\n`);
  } catch {
    // Dnevnik ni nujen.
  }
}

let config;
let mirror;
let server;
let mainWindow = null;
let settingsWindow = null;
let rendererReady = false;
let quitting = false;
let closeHandled = false;
const pendingFiles = [];
const mirrorStatus = { lastAt: null, written: 0, failed: 0 };
let restorePromptShown = false;
let flushWaiters = [];

// ---------- poti ----------
function webDir() {
  return isDev ? path.join(__dirname, "..", "web-dist") : path.join(process.resourcesPath, "web");
}
function desktopSupportDir() {
  return path.join(webDir(), "_desktop");
}
function upstreamInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(desktopSupportDir(), "upstream.json"), "utf8"));
  } catch {
    return { version: "neznana", ref: "", commit: "" };
  }
}
function iconPath() {
  return path.join(__dirname, "..", "build", process.platform === "win32" ? "icon.ico" : "icon.png");
}

// ---------- odpiranje datotek ----------
function lylPathsFromArgs(argv) {
  return argv.slice(isDev ? 2 : 1).filter((arg) => /\.(lyl|skf)$/i.test(arg) && fs.existsSync(arg));
}

function queueFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > MAX_OPEN_BYTES) throw new Error(tr("dlg.fileTooBig"));
    sendFile({ name: path.basename(filePath), bytes: fs.readFileSync(filePath) });
  } catch (error) {
    dialog.showErrorBox(tr("dlg.openFailed"), `${filePath}\n\n${error.message}`);
  }
}

function sendFile(file) {
  if (mainWindow && rendererReady) {
    mainWindow.webContents.send("app:open-file", file);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingFiles.push(file);
  }
}

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) queueFile(filePath);
  else pendingFiles.push({ lazyPath: filePath });
});

app.on("second-instance", (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  lylPathsFromArgs(argv).forEach(queueFile);
});

// ---------- okno ----------
function publicSettings() {
  const c = config.get();
  return { autosave: { enabled: c.autosave.enabled, intervalSec: c.autosave.intervalSec }, platform: process.platform };
}

function createMainWindow() {
  const bounds = config.get().windowBounds || {};
  mainWindow = new BrowserWindow({
    width: bounds.width || 1440,
    height: bounds.height || 900,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#1e2327",
    title: "Layerling",
    icon: fs.existsSync(iconPath()) ? iconPath() : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Časovnik samodejnega shranjevanja mora teči tudi, ko je okno minimirano.
      backgroundThrottling: false,
      spellcheck: false,
    },
  });
  if (bounds.maximized) mainWindow.maximize();
  // Naslovna vrstica: fiksen naslov brez »in your browser«, ki ga stran sicer nastavi sama.
  mainWindow.on("page-title-updated", (event) => event.preventDefault());
  mainWindow.setTitle(WINDOW_TITLE);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  // Stran je pripravljena šele, ko jo program sam sporoči; ob pravi navigaciji (ne ob spremembi naslova v isti strani) se to ponastavi.
  mainWindow.webContents.on("did-start-navigation", (details) => {
    if (details && details.isMainFrame && !details.isSameDocument) rendererReady = false;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${config.get().port}`) && !url.startsWith("file://")) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    saveBounds();
    if (closeHandled) return;
    event.preventDefault();
    closeHandled = true;
    // Pred zaprtjem se zadnje spremembe zapišejo na disk.
    requestFlush(4000).finally(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    });
  });
  mainWindow.on("closed", () => { mainWindow = null; closeHandled = false; });

  mainWindow.loadFile(path.join(__dirname, "loading.html"), { query: { lang: getLanguage() } });
}

function saveBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const maximized = mainWindow.isMaximized();
  const b = maximized ? (config.get().windowBounds || {}) : mainWindow.getBounds();
  config.update({ windowBounds: { x: b.x, y: b.y, width: b.width, height: b.height, maximized } });
}

function showLoadError(message) {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, "loading.html"), { query: { lang: getLanguage() } }).then(() => {
    const text = JSON.stringify(tr("dlg.startFailed", { message }));
    return mainWindow.webContents.executeJavaScript(
      `document.body.innerHTML = '<div class="err"></div>'; document.querySelector('.err').textContent = ${text};`,
    );
  }).catch(() => {});
}

async function startServerAndLoad() {
  const c = config.get();
  try {
    const url = await server.start({ port: c.port, sharedFolder: c.sharedFolder, mcpToken: c.mcpToken });
    log(`Strežnik teče na ${url}`);
    if (mainWindow) await mainWindow.loadURL(url);
    return true;
  } catch (error) {
    log(`Zagon strežnika ni uspel: ${error.message}`);
    if (error.code === "PORT_BUSY") {
      dialog.showErrorBox(
        tr("dlg.portBusyTitle"),
        tr("dlg.portBusy", { port: c.port }),
      );
    }
    showLoadError(error.message);
    return false;
  }
}

async function restartServer() {
  await requestFlush(4000);
  await server.stop();
  await startServerAndLoad();
}

// ---------- shranjevanje na disk (zrcalo) ----------
function requestFlush(timeoutMs) {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed() || !rendererReady) {
      log("Zapis ob zaprtju preskočen (okno ni pripravljeno).");
      return resolve();
    }
    const started = Date.now();
    let finished = false;
    const done = (timedOut) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      flushWaiters = flushWaiters.filter((w) => w !== done);
      log(timedOut === true ? `Zapis ob zaprtju: časovna omejitev (${timeoutMs} ms).` : `Zapis ob zaprtju končan v ${Date.now() - started} ms.`);
      resolve();
    };
    const timer = setTimeout(() => done(true), timeoutMs);
    flushWaiters.push(done);
    mainWindow.webContents.send("mirror:flush-request");
  });
}

ipcMain.on("mirror:flush-done", () => flushWaiters.slice().forEach((done) => done()));

ipcMain.handle("mirror:write", (_event, entries) => {
  if (!Array.isArray(entries)) return { written: 0, unchanged: 0, failed: [] };
  const result = mirror.write(entries);
  mirrorStatus.lastAt = Date.now();
  mirrorStatus.written += result.written;
  mirrorStatus.failed = result.failed.length;
  if (result.failed.length) {
    log(`Zapisovanje na disk ni uspelo za ${result.failed.length} projektov: ${JSON.stringify(result.failed)}`);
    if (Notification.isSupported()) {
      new Notification({ title: "Layerling", body: tr("dlg.autosaveFailed") }).show();
    }
  }
  return result;
});

ipcMain.handle("app:get-settings", () => publicSettings());

ipcMain.on("renderer:ready", () => {
  rendererReady = true;
  while (pendingFiles.length) {
    const item = pendingFiles.shift();
    if (item.lazyPath) queueFile(item.lazyPath);
    else mainWindow.webContents.send("app:open-file", item);
  }
});

ipcMain.on("renderer:project-count", async (_event, count) => {
  if (restorePromptShown || count !== 0 || !config.get().autosave.enabled) return;
  const files = mirror.listProjectFiles();
  if (!files.length) return;
  restorePromptShown = true;
  const { response } = await dialog.showMessageBox(mainWindow || undefined, {
    type: "question",
    title: tr("dlg.restoreFoundTitle"),
    message: tr("dlg.restoreFound", { count: files.length }),
    detail: `${config.get().autosave.folder}\n\n${tr("dlg.restoreAsk")}`,
    buttons: [tr("dlg.restoreYes"), tr("dlg.restoreNo")],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) restoreFromAutosave();
});

function restoreFromAutosave() {
  const files = mirror.listProjectFiles();
  if (!files.length) {
    dialog.showMessageBox(mainWindow || undefined, { type: "info", title: tr("dlg.restoreTitle"), message: tr("dlg.restoreNone"), detail: config.get().autosave.folder });
    return;
  }
  const entries = {};
  const used = new Set();
  for (const file of files) {
    let name = path.basename(file);
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${path.basename(file, ".lyl")} (${n}).lyl`;
    used.add(name.toLowerCase());
    entries[name] = [fs.readFileSync(file), { level: 0 }];
  }
  // Isti zapis ZIP kot "Varnostna kopija vseh projektov" v programu, zato ga program sam prepozna in uvozi.
  sendFile({ name: "layerling-obnova.zip", bytes: Buffer.from(zipSync(entries)) });
}

// ---------- nastavitve ----------
function settingsPayload() {
  const c = config.get();
  const icloud = detectICloudFolders();
  const mcpScript = path.join(desktopSupportDir(), "mcp", "layerling-mcp-server.mjs");
  return {
    config: c,
    appVersion: app.getVersion(),
    upstreamVersion: upstreamInfo().version,
    mirror: mirrorStatus,
    icloud,
    icloudTarget: icloud[0] ? path.join(icloud[0], "Layerling") : null,
    mcpConfig: mcpClientConfig({ execPath: process.execPath, mcpScript, port: c.port, token: c.mcpToken }),
  };
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 780,
    height: 760,
    parent: mainWindow || undefined,
    title: tr("settings.windowTitle"),
    backgroundColor: "#1e2327",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => { settingsWindow = null; });
}

ipcMain.handle("settings:load", () => settingsPayload());
ipcMain.handle("settings:strings", () => ({ language: getLanguage(), strings: STRINGS[getLanguage()] }));

// Urejevalnik sporoči jezik (preklopnik EN/SL); lupina (meniji, okna, posodobitve) mu sledi.
ipcMain.on("renderer:language", (_event, language) => {
  const next = normalizeLanguage(language);
  if (!next || next === getLanguage()) return;
  setLanguage(next);
  config.update({ language: next });
  installMenu();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.setTitle(tr("settings.windowTitle"));
    settingsWindow.webContents.reload();
  }
});

ipcMain.handle("settings:save", async (_event, patch) => {
  const before = config.get();
  const safePatch = {};
  if (patch && patch.autosave) safePatch.autosave = patch.autosave;
  if (patch && "sharedFolder" in patch) safePatch.sharedFolder = patch.sharedFolder;
  if (patch && "checkUpdatesOnStart" in patch) safePatch.checkUpdatesOnStart = !!patch.checkUpdatesOnStart;

  // Mapa mora biti zapisljiva, sicer bi uporabnik mislil, da je shranjeno, pa ne bi bilo.
  const folders = [];
  if (safePatch.autosave && safePatch.autosave.folder) folders.push([tr("dlg.autosaveFolder"), safePatch.autosave.folder]);
  if (safePatch.sharedFolder) folders.push([tr("dlg.sharedFolder"), safePatch.sharedFolder]);
  for (const [label, folder] of folders) {
    try {
      fs.mkdirSync(folder, { recursive: true });
      const probe = path.join(folder, `.layerling-preizkus-${process.pid}`);
      fs.writeFileSync(probe, "x");
      fs.rmSync(probe, { force: true });
    } catch (error) {
      return { error: tr("dlg.folderNotWritable", { label, folder, message: error.message }) };
    }
  }

  const after = config.update(safePatch);
  if (mainWindow) mainWindow.webContents.send("app:settings-changed", publicSettings());
  if (after.sharedFolder !== before.sharedFolder) await restartServer();
  return settingsPayload();
});

ipcMain.handle("settings:regenerate-token", async () => {
  config.update({ mcpToken: "" });
  await restartServer();
  return settingsPayload();
});

ipcMain.handle("settings:pick-folder", async (_event, options) => {
  const result = await dialog.showOpenDialog(settingsWindow || mainWindow || undefined, {
    title: (options && options.title) || tr("dlg.pickFolder"),
    defaultPath: options && options.defaultPath ? options.defaultPath : undefined,
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
});

ipcMain.handle("settings:open-folder", (_event, target) => {
  if (typeof target === "string" && target) {
    fs.mkdirSync(target, { recursive: true });
    return shell.openPath(target);
  }
  return null;
});
ipcMain.handle("settings:check-updates", () => updater.check({ userInitiated: true, repo: REPO, log }));
ipcMain.handle("settings:copy", (_event, text) => clipboard.writeText(String(text)));
ipcMain.on("settings:close", () => { if (settingsWindow) settingsWindow.close(); });

// ---------- meni ----------
function showAbout() {
  const up = upstreamInfo();
  dialog.showMessageBox(mainWindow || undefined, {
    type: "info",
    title: tr("dlg.aboutTitle"),
    message: `Layerling ${app.getVersion()}`,
    detail:
      `${tr("dlg.aboutStandalone", { os: isMac ? "macOS" : "Windows" })}\n` +
      `${tr("dlg.aboutBase", { version: up.version, commit: up.commit ? ` (${String(up.commit).slice(0, 7)})` : "" })}\n` +
      `${tr("dlg.aboutLicense")}\n\n${tr("dlg.aboutSource", { url: SOURCE_URL })}`,
  });
}

async function openProjectDialog() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: tr("dlg.openProjectTitle"),
    properties: ["openFile"],
    filters: [{ name: tr("dlg.openProjectFilter"), extensions: ["lyl", "skf"] }, { name: tr("dlg.allFiles"), extensions: ["*"] }],
  });
  if (!result.canceled) result.filePaths.forEach(queueFile);
}

function installMenu() {
  Menu.setApplicationMenu(buildMenu({
    isMac,
    isDev,
    actions: {
      about: showAbout,
      settings: openSettings,
      settingsAi: openSettings,
      openProject: openProjectDialog,
      openAutosaveFolder: () => {
        const folder = config.get().autosave.folder;
        fs.mkdirSync(folder, { recursive: true });
        shell.openPath(folder);
      },
      restoreFromAutosave,
      checkUpdates: () => updater.check({ userInitiated: true, repo: REPO, log }),
      docs: () => shell.openExternal(UPSTREAM_DOCS_URL),
      source: () => shell.openExternal(SOURCE_URL),
    },
  }));
}

// ---------- zagon ----------
function hardenSession() {
  const allowed = new Set(["clipboard-read", "clipboard-sanitized-write", "fullscreen"]);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

app.whenReady().then(async () => {
  app.setAppUserModelId("si.cassettedeck-service.layerling");
  config = new ConfigStore(path.join(app.getPath("userData"), "settings.json"), app.getPath("documents"));
  mirror = new Mirror(() => config.get().autosave);
  server = new EmbeddedServer({
    webDir: webDir(),
    runnerPath: path.join(desktopSupportDir(), "server-runner.js"),
    onLog: log,
  });
  setLanguage(normalizeLanguage(config.get().language) || languageFromLocale(app.getLocale()));
  hardenSession();
  installMenu();
  createMainWindow();
  lylPathsFromArgs(process.argv).forEach(queueFile);
  const started = await startServerAndLoad();
  if (started) {
    updater.setup({ getWindow: () => mainWindow, repo: REPO, log });
    if (config.get().checkUpdatesOnStart) setTimeout(() => updater.check({ repo: REPO, log }), 12000);
  }
});

app.on("activate", () => {
  if (!mainWindow && app.isReady()) {
    createMainWindow();
    startServerAndLoad();
  }
});

app.on("window-all-closed", () => app.quit());

app.on("before-quit", (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  requestFlush(4000)
    .then(() => server.stop())
    .finally(() => app.quit());
});
