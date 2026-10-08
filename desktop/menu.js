"use strict";
const { Menu } = require("electron");

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
        { label: "O programu Layerling", click: actions.about },
        { type: "separator" },
        { label: "Nastavitve …", accelerator: "CmdOrCtrl+,", click: actions.settings },
        { type: "separator" },
        { role: "hide", label: "Skrij Layerling" },
        { role: "hideOthers", label: "Skrij ostale" },
        { role: "unhide", label: "Pokaži vse" },
        { type: "separator" },
        { role: "quit", label: "Končaj Layerling" },
      ],
    }] : []),
    {
      label: "Datoteka",
      submenu: [
        { label: "Odpri projekt (.lyl) …", accelerator: "CmdOrCtrl+Shift+O", click: actions.openProject },
        { type: "separator" },
        { label: "Odpri mapo samodejnega shranjevanja", click: actions.openAutosaveFolder },
        { label: "Obnovi projekte iz samodejnega shranjevanja …", click: actions.restoreFromAutosave },
        { type: "separator" },
        ...(isMac ? [{ role: "close", label: "Zapri okno" }] : [
          { label: "Nastavitve …", accelerator: "CmdOrCtrl+,", click: actions.settings },
          { type: "separator" },
          { role: "quit", label: "Izhod" },
        ]),
      ],
    },
    ...(isMac ? [{
      label: "Urejanje",
      submenu: [
        { role: "undo", label: "Razveljavi", ...noGrab },
        { role: "redo", label: "Uveljavi", ...noGrab },
        { type: "separator" },
        { role: "cut", label: "Izreži", ...noGrab },
        { role: "copy", label: "Kopiraj", ...noGrab },
        { role: "paste", label: "Prilepi", ...noGrab },
        { role: "selectAll", label: "Izberi vse", ...noGrab },
      ],
    }] : []),
    {
      label: "Pogled",
      submenu: [
        { role: "reload", label: "Ponovno naloži" },
        { type: "separator" },
        { role: "zoomIn", label: "Povečaj vmesnik" },
        { role: "zoomOut", label: "Pomanjšaj vmesnik" },
        { role: "resetZoom", label: "Običajna velikost" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Celozaslonski način" },
        ...(isDev ? [{ type: "separator" }, { role: "toggleDevTools", label: "Orodja za razvijalce" }] : []),
      ],
    },
    { role: "windowMenu", label: "Okno" },
    {
      label: "Pomoč",
      submenu: [
        { label: "Preveri posodobitve …", click: actions.checkUpdates },
        { label: "Povezava z AI (MCP) …", click: actions.settingsAi },
        { type: "separator" },
        { label: "Navodila (originalna dokumentacija)", click: actions.docs },
        { label: "Izvorna koda (AGPL-3.0)", click: actions.source },
        ...(isMac ? [] : [{ type: "separator" }, { label: "O programu Layerling", click: actions.about }]),
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
