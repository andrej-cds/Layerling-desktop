"use strict";
// Po pakiranju prekopira spletni del (web-dist) v mapo resources/web.
// To ni mogoče z `extraResources`, ker electron-builder pri njih vedno izpusti mape node_modules,
// naš strežnik pa jih nujno potrebuje.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const resources = electronPlatformName === "darwin"
    ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
    : path.join(appOutDir, "resources");
  const from = path.join(packager.projectDir, "web-dist");
  if (!fs.existsSync(path.join(from, "apps", "web", "server.js"))) {
    throw new Error(`Manjka web-dist (${from}). Najprej zaženite "npm run build:web".`);
  }
  const to = path.join(resources, "web");
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true, dereference: true });
  console.log(`  • web-dist kopiran v ${to}`);
};
