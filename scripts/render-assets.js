"use strict";
// Maintainer tool: render icons/icon.svg to the PNG sizes the manifest and
// stores need, and store/*.html to listing images. Drives a local Chrome or
// Chromium over the DevTools protocol (Node 22's built-in WebSocket), so
// there is still nothing to install. Outputs are committed; rerun only after
// changing the SVG/HTML sources.
//
//   npm run assets                      # finds Chrome on PATH / usual spots
//   CHROME=/path/to/chrome npm run assets

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const ICON_SIZES = [16, 32, 48, 128];
const ICON_VIEWBOX = 128;
const STORE_IMAGES = [
  { src: "store/screenshot.html", out: "store/screenshot-1280x800.png", width: 1280, height: 800 },
  { src: "store/promo-tile.html", out: "store/promo-tile-440x280.png", width: 440, height: 280 },
];

const CHROME_CANDIDATES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const candidate of CHROME_CANDIDATES) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // not installed here — try the next one
    }
  }
  throw new Error("No Chrome/Chromium found. Set CHROME=/path/to/chrome.");
}

// Start headless Chrome and resolve with its browser-level DevTools URL.
function launch(chromePath, profileDir) {
  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
  ];
  if (process.getuid?.() === 0) args.push("--no-sandbox"); // CI containers
  const proc = spawn(chromePath, [...args, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  return new Promise((resolve, reject) => {
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve({ proc, wsUrl: match[1] });
    });
    proc.on("exit", (code) => reject(new Error(`Chrome exited (${code}):\n${stderr}`)));
  });
}

// Minimal CDP client: send(method, params, sessionId) → result; once(event).
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const waiters = [];
  ws.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else resolve(msg.result);
      return;
    }
    const i = waiters.findIndex((w) => w.method === msg.method);
    if (i !== -1) waiters.splice(i, 1)[0].resolve(msg.params);
  });
  const client = {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    once(method) {
      return new Promise((resolve) => waiters.push({ method, resolve }));
    },
    close: () => ws.close(),
  };
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(client));
    ws.addEventListener("error", reject);
  });
}

async function capture(cdp, sessionId, { url, out, width, height, scale = 1, transparent }) {
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: transparent ? { r: 0, g: 0, b: 0, a: 0 } : { r: 255, g: 255, b: 255, a: 1 },
  });
  const loaded = cdp.once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width, height, scale },
  });
  fs.writeFileSync(path.join(ROOT, out), Buffer.from(data, "base64"));
  console.log(`wrote ${out}`);
}

async function main() {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "otp-peek-assets-"));
  const { proc, wsUrl } = await launch(findChrome(), profileDir);
  try {
    const cdp = await connect(wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);

    const iconUrl = pathToFileURL(path.join(ROOT, "icons/icon.svg")).href;
    for (const size of ICON_SIZES) {
      await capture(cdp, sessionId, {
        url: iconUrl,
        out: `icons/icon-${size}.png`,
        width: ICON_VIEWBOX,
        height: ICON_VIEWBOX,
        scale: size / ICON_VIEWBOX,
        transparent: true,
      });
    }
    for (const { src, out, width, height } of STORE_IMAGES) {
      const url = pathToFileURL(path.join(ROOT, src)).href;
      await capture(cdp, sessionId, { url, out, width, height });
    }
    cdp.close();
  } finally {
    proc.kill();
    // Chrome may still hold profile files for a moment after kill.
    setTimeout(() => fs.rmSync(profileDir, { recursive: true, force: true }), 500);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
