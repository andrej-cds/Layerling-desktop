"use strict";
const { Menu } = require("electron");
const { tr } = require("./strings");

/**
 * Meni. Urejevalnik ima lastne bližnjice (Ctrl+Z, Ctrl+C, Ctrl+V, Ctrl+K …), zato jih meni ne sme prestreči:
 * v Windowsih Urejanje sploh ni v meniju, na Macu so postavke prikazane brez registracije bližnjice.
 */
function buildMenu({ isMac, isDev, actions }) {
  const noGrab = isMac ? { registerAccelerator: false } : {};
  const template = [
    ...(isMac ? [{
      label: "Layerling",
      submenu: [
        { id: "about", label: tr("menu.about"), click: actions.about },
        { type: "separator" },
        { id: "settings", label: tr("menu.settings"), accelerator: "CmdOrCtrl+,", click: actions.settings },
        { type: "separator" },
        { role: "hide", label: tr("menu.hide") },
        { role: "hideOthers", label: tr("menu.hideOthers") },
        { role: "unhide", label: tr("menu.unhide") },
        { type: "separator" },
        { role: "quit", label: tr("menu.quitMac") },
      ],
    }] : []),
    {
      label: tr("menu.file"),
      submenu: [
        { id: "openProject", label: tr("menu.openProject"), accelerator: "CmdOrCtrl+Shift+O", click: actions.openProject },
        { type: "separator" },
        { label: tr("menu.openAutosaveFolder"), click: actions.openAutosaveFolder },
        { id: "restore", label: tr("menu.restore"), click: actions.restoreFromAutosave },
        { type: "separator" },
        ...(isMac ? [{ role: "close", label: tr("menu.closeWindow") }] : [
          { id: "settings", label: tr("menu.settings"), accelerator: "CmdOrCtrl+,", click: actions.settings },
          { type: "separator" },
          { role: "quit", label: tr("menu.exit") },
        ]),
      ],
    },
    ...(isMac ? [{
      label: tr("menu.edit"),
      submenu: [
        { role: "undo", label: tr("menu.undo"), ...noGrab },
        { role: "redo", label: tr("menu.redo"), ...noGrab },
        { type: "separator" },
        { role: "cut", label: tr("menu.cut"), ...noGrab },
        { role: "copy", label: tr("menu.copy"), ...noGrab },
        { role: "paste", label: tr("menu.paste"), ...noGrab },
        { role: "selectAll", label: tr("menu.selectAll"), ...noGrab },
      ],
    }] : []),
    {
      label: tr("menu.view"),
      submenu: [
        { role: "reload", label: tr("menu.reload") },
        { type: "separator" },
        { role: "zoomIn", label: tr("menu.zoomIn") },
        { role: "zoomOut", label: tr("menu.zoomOut") },
        { role: "resetZoom", label: tr("menu.resetZoom") },
        { type: "separator" },
        { role: "togglefullscreen", label: tr("menu.fullscreen") },
        ...(isDev ? [{ type: "separator" }, { role: "toggleDevTools", label: tr("menu.devtools") }] : []),
      ],
    },
    { role: "windowMenu", label: tr("menu.window") },
    {
      label: tr("menu.help"),
      submenu: [
        { id: "checkUpdates", label: tr("menu.checkUpdates"), click: actions.checkUpdates },
        { label: tr("menu.ai"), click: actions.settingsAi },
        { type: "separator" },
        { label: tr("menu.docs"), click: actions.docs },
        { label: tr("menu.source"), click: actions.source },
        ...(isMac ? [] : [{ type: "separator" }, { id: "about", label: tr("menu.about"), click: actions.about }]),
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
