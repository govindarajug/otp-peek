"use strict";
// Build store-ready zips: dist/otp-peek-<browser>-<version>.zip for the
// Chrome Web Store and addons.mozilla.org. The source tree stays loadable
// unpacked in both browsers; this only (1) ships an allowlist of runtime
// files and (2) trims the cross-browser manifest to what each store expects,
// so neither reviewer sees the other engine's keys. Node stdlib only.
//
//   npm run package

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = path.resolve(__dirname, "..");

// Everything the extension loads at runtime. Anything else (tests, docs,
// store art, CI config) stays out of the store upload.
const SHARED_FILES = [
  "LICENSE",
  "background.js",
  "extractor.js",
  "feed.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];
const CHROME_ONLY_FILES = ["background-chrome.js", "offscreen.html", "offscreen.js"];

function chromeManifest(manifest) {
  const out = structuredClone(manifest);
  delete out.browser_specific_settings;
  // Chrome runs background.js as a service worker and importScripts the rest.
  delete out.background.scripts;
  out.minimum_chrome_version = "109"; // chrome.offscreen
  return out;
}

function firefoxManifest(manifest) {
  const out = structuredClone(manifest);
  // Firefox runs an event page from background.scripts; it has no
  // service_worker or offscreen support, and AMO's linter flags both.
  delete out.background.service_worker;
  out.permissions = out.permissions.filter((p) => p !== "offscreen");
  return out;
}

const TARGETS = {
  chrome: { manifest: chromeManifest, files: [...SHARED_FILES, ...CHROME_ONLY_FILES] },
  firefox: { manifest: firefoxManifest, files: SHARED_FILES },
};

// Minimal zip writer (deflate, no zip64) — store uploads are a few dozen KB.
// Fixed timestamps keep builds byte-for-byte reproducible.
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1; // 1980-01-01

function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix, v2.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + deflated.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function main() {
  const manifest = readJson("manifest.json");
  const pkg = readJson("package.json");
  if (manifest.version !== pkg.version) {
    throw new Error(
      `Version mismatch: manifest.json ${manifest.version} vs package.json ${pkg.version}`,
    );
  }
  const tag = process.env.RELEASE_TAG;
  if (tag && tag !== `v${manifest.version}`) {
    throw new Error(`Tag ${tag} does not match manifest version ${manifest.version}`);
  }

  const distDir = path.join(ROOT, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  for (const [browser, target] of Object.entries(TARGETS)) {
    const entries = [
      {
        name: "manifest.json",
        data: Buffer.from(JSON.stringify(target.manifest(manifest), null, 2) + "\n"),
      },
      ...target.files.map((name) => ({ name, data: fs.readFileSync(path.join(ROOT, name)) })),
    ];
    const out = path.join(distDir, `otp-peek-${browser}-${manifest.version}.zip`);
    fs.writeFileSync(out, zip(entries));
    console.log(`wrote ${path.relative(ROOT, out)} (${entries.length} files)`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { chromeManifest, firefoxManifest, TARGETS };
