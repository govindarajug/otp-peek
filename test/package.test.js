"use strict";
// Guards the store packaging: every file the extension references must ship
// in each browser's zip, and each zip's manifest must only carry that
// browser's keys.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { chromeManifest, firefoxManifest, TARGETS } = require("../scripts/package.js");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

// Files a built manifest points at, plus what its pages and scripts load.
function referencedFiles(built, extraPages) {
  const refs = new Set([
    ...Object.values(built.icons ?? {}),
    ...Object.values(built.action?.default_icon ?? {}),
    built.action?.default_popup,
    built.background.service_worker,
    ...(built.background.scripts ?? []),
    ...extraPages,
  ]);
  refs.delete(undefined);
  for (const file of [...refs]) {
    if (file.endsWith(".html")) {
      for (const [, ref] of read(file).matchAll(/(?:src|href)="([^"]+)"/g)) refs.add(ref);
    }
    if (file.endsWith(".js")) {
      for (const [, args] of read(file).matchAll(/importScripts\(([^)]*)\)/g)) {
        for (const [, ref] of args.matchAll(/"([^"]+)"/g)) refs.add(ref);
      }
    }
  }
  return refs;
}

test("chrome manifest drops Firefox-only keys", () => {
  const built = chromeManifest(manifest);
  assert.equal(built.browser_specific_settings, undefined);
  assert.equal(built.background.scripts, undefined);
  assert.equal(built.background.service_worker, "background-chrome.js");
  assert.ok(built.permissions.includes("offscreen"));
});

test("firefox manifest drops Chrome-only keys and keeps the gecko id", () => {
  const built = firefoxManifest(manifest);
  assert.equal(built.background.service_worker, undefined);
  assert.deepEqual(built.background.scripts, manifest.background.scripts);
  assert.ok(!built.permissions.includes("offscreen"));
  assert.ok(built.browser_specific_settings.gecko.id);
});

test("firefox zip ships no offscreen calls (AMO flags them)", () => {
  for (const file of TARGETS.firefox.files.filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(read(file), /\boffscreen\./, `${file} calls the offscreen API`);
  }
});

test("gecko minimum versions support data_collection_permissions", () => {
  // AMO warns when strict_min_version predates the key: Firefox 140,
  // Firefox for Android 142.
  const { gecko, gecko_android } = firefoxManifest(manifest).browser_specific_settings;
  assert.ok(gecko.data_collection_permissions);
  assert.ok(parseFloat(gecko.strict_min_version) >= 140, "gecko.strict_min_version < 140");
  assert.ok(parseFloat(gecko_android?.strict_min_version) >= 142, "gecko_android.strict_min_version < 142");
});

test("transforms do not mutate the source manifest", () => {
  const before = JSON.stringify(manifest);
  chromeManifest(manifest);
  firefoxManifest(manifest);
  assert.equal(JSON.stringify(manifest), before);
});

test("chrome zip ships every referenced file, offscreen page included", () => {
  const built = chromeManifest(manifest);
  for (const file of referencedFiles(built, ["offscreen.html"])) {
    assert.ok(TARGETS.chrome.files.includes(file), `chrome zip is missing ${file}`);
  }
});

test("firefox zip ships every referenced file", () => {
  for (const file of referencedFiles(firefoxManifest(manifest), [])) {
    assert.ok(TARGETS.firefox.files.includes(file), `firefox zip is missing ${file}`);
  }
});

test("every packaged file exists", () => {
  for (const [browser, { files }] of Object.entries(TARGETS)) {
    for (const file of files) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `${browser}: ${file} not found`);
    }
  }
});

test("package.json and manifest.json versions match", () => {
  assert.equal(JSON.parse(read("package.json")).version, manifest.version);
});
