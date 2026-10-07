"use strict";
// Hotkey (Alt+Shift+C): fetch feeds, copy the newest OTP, flash a badge.
// Runs as a service worker in Chrome (imported by background-chrome.js) and
// as an event page in Firefox (files preloaded via manifest background.scripts).

const bgExt = globalThis.browser ?? globalThis.chrome;

async function copyText(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    // Firefox event page: direct write is allowed with clipboardWrite.
    await navigator.clipboard.writeText(text);
    return;
  }
  // Chrome service worker has no clipboard — background-chrome.js relays it.
  await copyViaOffscreen(text);
}

function flashBadge(text, color) {
  bgExt.action.setBadgeBackgroundColor({ color });
  bgExt.action.setBadgeText({ text });
  setTimeout(() => bgExt.action.setBadgeText({ text: "" }), 3000);
}

async function copyLatestOtp() {
  if (!(await bgExt.permissions.contains({ origins: FEED_ORIGINS }))) {
    // Firefox before the one-time grant: open the popup once instead.
    flashBadge("!", "#c62828");
    return;
  }
  try {
    const { rows, anyFeed } = await collectRows();
    const top = OtpPeek.rankRows(rows, Date.now())[0];
    if (!anyFeed || !top) {
      flashBadge("×", "#c62828");
      return;
    }
    await copyText(top.code);
    flashBadge("✓", "#2e7d32");
  } catch {
    flashBadge("!", "#c62828");
  }
}

bgExt.commands.onCommand.addListener((command) => {
  if (command === "copy-latest-otp") copyLatestOtp();
});
