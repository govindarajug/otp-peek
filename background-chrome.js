"use strict";
// Chrome service worker entry. Firefox runs the shared files as an event page
// (manifest background.scripts) and never loads this one, so the offscreen
// relay stays out of the Firefox package, where AMO's linter flags it.

// The service worker has no clipboard; relay through an offscreen document.
// Called from background.js's copyText.
async function copyViaOffscreen(text) {
  await chrome.offscreen
    .createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Write the OTP code to the clipboard",
    })
    .catch(() => {}); // already open
  await chrome.runtime.sendMessage({ type: "copyToClipboard", text });
}

importScripts("extractor.js", "feed.js", "background.js");
