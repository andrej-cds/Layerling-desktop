"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsApi", {
  load: () => ipcRenderer.invoke("settings:load"),
  strings: () => ipcRenderer.invoke("settings:strings"),
  save: (patch) => ipcRenderer.invoke("settings:save", patch),
  pickFolder: (options) => ipcRenderer.invoke("settings:pick-folder", options),
  openFolder: (target) => ipcRenderer.invoke("settings:open-folder", target),
  checkUpdates: () => ipcRenderer.invoke("settings:check-updates"),
  regenerateToken: () => ipcRenderer.invoke("settings:regenerate-token"),
  graphicsInfo: () => ipcRenderer.invoke("settings:graphics-info"),
  copyText: (text) => ipcRenderer.invoke("settings:copy", text),
  close: () => ipcRenderer.send("settings:close"),
});
