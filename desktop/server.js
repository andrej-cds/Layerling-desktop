"use strict";
// Upravlja vgrajen strežnik (Next.js standalone), ki streže originalni program na 127.0.0.1.
const { fork } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

function waitForPort(port, timeoutMs, isAlive) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (!isAlive()) return reject(new Error("Strežnik se je nepričakovano ustavil."));
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) reject(new Error("Strežnik se ni zagnal v pričakovanem času."));
        else setTimeout(attempt, 150);
      });
    };
    attempt();
  });
}

/** Najde server.js v mapi z izdelkom (razlikuje se glede na to, kje je bil Next zgrajen). */
function findServerEntry(webDir) {
  const candidates = [path.join(webDir, "apps", "web", "server.js"), path.join(webDir, "server.js")];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

class EmbeddedServer {
  constructor({ webDir, runnerPath, onLog }) {
    this.webDir = webDir;
    this.runnerPath = runnerPath;
    this.onLog = onLog || (() => {});
    this.child = null;
    this.port = null;
  }

  async start({ port, sharedFolder, mcpToken }) {
    const entry = findServerEntry(this.webDir);
    if (!entry) throw new Error(`Manjka zgrajen program (${this.webDir}). Zaženite "npm run build:web".`);
    if (!(await portIsFree(port))) {
      const error = new Error(`Vrata ${port} že uporablja drug program.`);
      error.code = "PORT_BUSY";
      throw error;
    }
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NEXT_TELEMETRY_DISABLED: "1",
      // Vmesnik za AI (MCP) je omogočen, vendar zaščiten z žetonom in dostopen le na tem računalniku.
      LAYERLING_MCP_REMOTE: "true",
      LAYERLING_MCP_TOKEN: mcpToken,
    };
    if (sharedFolder) env.LAYERLING_SHARED_PROJECTS_DIR = sharedFolder;
    else delete env.LAYERLING_SHARED_PROJECTS_DIR;

    this.child = fork(this.runnerPath, [entry], { env, stdio: ["ignore", "pipe", "pipe", "ipc"], execPath: process.execPath });
    this.port = port;
    this.child.stdout.on("data", (chunk) => this.onLog(String(chunk)));
    this.child.stderr.on("data", (chunk) => this.onLog(String(chunk)));
    let alive = true;
    this.child.once("exit", (code) => {
      alive = false;
      this.onLog(`Strežnik se je ustavil (koda ${code}).`);
    });
    await waitForPort(port, 40000, () => alive);
    return `http://127.0.0.1:${port}`;
  }

  async stop() {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        child.kill();
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
  }
}

module.exports = { EmbeddedServer, portIsFree, findServerEntry };
