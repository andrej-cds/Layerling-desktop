"use strict";
// Most med spletnim programom in Electronom. Spletni program vidi samo ta ozek vmesnik.
const { contextBridge, ipcRenderer } = require("electron");

function listen(channel, callback) {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("layerlingDesktop", {
  isDesktop: true,
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke("app:get-settings"),
  onSettings: (callback) => listen("app:settings-changed", callback),
  mirrorWrite: (entries) => ipcRenderer.invoke("mirror:write", entries),
  onFlushRequest: (callback) => listen("mirror:flush-request", callback),
  flushDone: () => ipcRenderer.send("mirror:flush-done"),
  onOpenFile: (callback) => listen("app:open-file", callback),
  ready: () => ipcRenderer.send("renderer:ready"),
  reportProjectCount: (count) => ipcRenderer.send("renderer:project-count", count),
  reportLanguage: (language) => ipcRenderer.send("renderer:language", language),
});
