"use strict";
// Shared feed transport: fetch Gmail's unread-inbox atom feeds and collect
// rows. Loaded by popup.html and the background script; parsing/ranking
// lives in extractor.js (OtpPeek).

const FEED_ORIGINS = ["https://mail.google.com/*"];
const ACCOUNT_SLOTS = 3;

async function fetchFeed(accountIndex) {
  const resp = await fetch(`https://mail.google.com/mail/u/${accountIndex}/feed/atom`, {
    credentials: "include",
  });
  if (!resp.ok) return null;
  const text = await resp.text();
  // Signed-out slots redirect to a login HTML page — not a feed.
  return text.includes("<feed") ? OtpPeek.parseFeed(text) : null;
}

async function collectRows() {
  const rows = [];
  const seen = new Set();
  let anyFeed = false;
  for (let u = 0; u < ACCOUNT_SLOTS; u++) {
    let feedRows = null;
    try {
      feedRows = await fetchFeed(u);
    } catch {
      // network error or absent account slot — skip
    }
    if (feedRows === null) continue;
    anyFeed = true;
    for (const row of feedRows) {
      const key = `${row.ts}|${row.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return { rows, anyFeed };
}
