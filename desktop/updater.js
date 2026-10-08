"use strict";
// Posodobitve programa. Nič se ne prenese ali namesti brez potrditve uporabnika.
const { app, dialog, shell } = require("electron");
const { cleanReleaseNotes } = require("./notes");
const { tr } = require("./strings");

let autoUpdater = null;
let wiredUp = false;
let interactive = false;
let busy = false;

function loadUpdater() {
  if (!autoUpdater) ({ autoUpdater } = require("electron-updater"));
  return autoUpdater;
}

function releasesUrl(repo) {
  return `https://github.com/${repo}/releases/latest`;
}

function setup({ getWindow, repo, log }) {
  if (wiredUp || !app.isPackaged) return;
  wiredUp = true;
  const updater = loadUpdater();
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.logger = { info: log, warn: log, error: log, debug: () => {} };
  // Samo za samodejne preizkuse: lasten vir posodobitev namesto GitHuba.
  if (process.env.LAYERLING_E2E === "1" && process.env.LAYERLING_UPDATE_FEED) {
    updater.setFeedURL({ provider: "generic", url: process.env.LAYERLING_UPDATE_FEED });
  }

  updater.on("update-available", async (info) => {
    const win = getWindow();
    const macManual = process.platform === "darwin";
    const notes = cleanReleaseNotes(info.releaseNotes);
    const { response } = await dialog.showMessageBox(win || undefined, {
      type: "info",
      title: tr("update.title"),
      message: tr("update.available", { version: info.version }),
      detail: `${tr("update.current", { version: app.getVersion() })}${notes ? `\n\n${notes}` : ""}\n\n${macManual ? tr("update.askMac") : tr("update.askWin")}`,
      buttons: [macManual ? tr("update.openPage") : tr("update.download"), tr("update.later")],
      defaultId: 0,
      cancelId: 1,
    });
    busy = false;
    if (response !== 0) return;
    if (macManual) {
      shell.openExternal(releasesUrl(repo));
      return;
    }
    busy = true;
    try {
      await updater.downloadUpdate();
    } catch (error) {
      busy = false;
      if (win) win.setProgressBar(-1);
      dialog.showErrorBox(tr("update.downloadFailed"), String(error && error.message ? error.message : error));
    }
  });

  updater.on("update-not-available", () => {
    busy = false;
    if (interactive) {
      dialog.showMessageBox(getWindow() || undefined, {
        type: "info",
        title: tr("update.upToDateTitle"),
        message: tr("update.upToDate"),
        detail: `Layerling ${app.getVersion()}`,
      });
    }
  });

  updater.on("download-progress", (progress) => {
    const win = getWindow();
    if (win) win.setProgressBar(Math.max(0, Math.min(1, progress.percent / 100)));
  });

  updater.on("update-downloaded", async (info) => {
    busy = false;
    const win = getWindow();
    if (win) win.setProgressBar(-1);
    const { response } = await dialog.showMessageBox(win || undefined, {
      type: "question",
      title: tr("update.downloadedTitle"),
      message: tr("update.downloaded", { version: info.version }),
      detail: tr("update.downloadedDetail"),
      buttons: [tr("update.installNow"), tr("update.onExit")],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) updater.quitAndInstall();
    else updater.autoInstallOnAppQuit = true;
  });

  updater.on("error", (error) => {
    busy = false;
    const win = getWindow();
    if (win) win.setProgressBar(-1);
    log(`Posodobitve: ${error && error.message ? error.message : error}`);
    if (interactive) {
      dialog.showMessageBox(win || undefined, {
        type: "warning",
        title: tr("update.upToDateTitle"),
        message: tr("update.checkFailed"),
        detail: tr("update.checkFailedDetail"),
      });
    }
  });
}

/** `userInitiated`: pokaži tudi odgovor "ni novosti" in napake. */
async function check({ userInitiated = false, repo, log }) {
  if (!app.isPackaged) {
    if (userInitiated) {
      dialog.showMessageBox({ type: "info", title: tr("update.upToDateTitle"), message: tr("update.devOnly") });
    }
    return;
  }
  if (busy) return;
  interactive = userInitiated;
  busy = true;
  try {
    await loadUpdater().checkForUpdates();
  } catch (error) {
    busy = false;
    log(`Posodobitve: ${error && error.message ? error.message : error}`);
  }
}

module.exports = { setup, check, releasesUrl };
