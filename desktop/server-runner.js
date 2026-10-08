"use strict";
// Zažene Next.js strežnik originalnega programa (poganja ga Electron v načinu Node).
// Če se glavni proces zaključi, se zaključi tudi strežnik, da ne ostane viseč.
const path = require("node:path");

process.on("disconnect", () => process.exit(0));
const serverEntry = process.argv[2];
if (!serverEntry) {
  console.error("Manjka pot do server.js");
  process.exit(2);
}
process.chdir(path.dirname(serverEntry));
require(serverEntry);
