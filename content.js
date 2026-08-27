"use strict";
// Selector-only scraper for the Gmail inbox list. All ranking/extraction
// lives in extractor.js on the popup side.

(() => {
  if (window.__otpPeekLoaded) return;
  window.__otpPeekLoaded = true;

  // Gmail inbox list row selectors, isolated here for easy patching when
  // Google shuffles classnames.
  function scrapeRows() {
    const rows = [];
    for (const tr of document.querySelectorAll("tr.zA")) {
      const subject = tr.querySelector(".bog")?.textContent?.trim() ?? "";
      const snippet = tr.querySelector(".y2")?.textContent?.trim() ?? "";
      const title = tr.querySelector(".xW span[title]")?.getAttribute("title") ?? "";
      const senderEl = tr.querySelector("span[email]");
      const sender =
        senderEl?.getAttribute("name") || senderEl?.getAttribute("email") || "";
      const parsed = Date.parse(title);
      rows.push({ subject, snippet, sender, ts: Number.isNaN(parsed) ? null : parsed });
    }
    return rows;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "getRows") sendResponse({ rows: scrapeRows() });
  });
})();
