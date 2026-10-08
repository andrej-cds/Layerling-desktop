"use strict";
// Pomožne funkcije za iCloud Drive in povezavo z AI odjemalcem (MCP).
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/** Mape iCloud Drive, ki obstajajo na tem računalniku. */
function detectICloudFolders(platform = process.platform, home = os.homedir()) {
  const candidates = [];
  if (platform === "darwin") candidates.push(path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs"));
  if (platform === "win32") candidates.push(path.join(home, "iCloudDrive"), path.join(home, "iCloud Drive"));
  return candidates.filter((candidate) => {
    try {
      return fs.statSync(candidate).isDirectory();
    } catch {
      return false;
    }
  });
}

/**
 * Vnos za nastavitve odjemalca MCP (npr. Claude Desktop). Skript poganja kar Electron v načinu Node,
 * zato na računalniku ni treba imeti nameščenega Node.js.
 */
function mcpClientConfig({ execPath, mcpScript, port, token }) {
  return {
    mcpServers: {
      layerling: {
        command: execPath,
        args: [mcpScript],
        env: {
          ELECTRON_RUN_AS_NODE: "1",
          LAYERLING_URL: `http://127.0.0.1:${port}`,
          LAYERLING_MCP_TOKEN: token,
        },
      },
    },
  };
}

module.exports = { detectICloudFolders, mcpClientConfig };
