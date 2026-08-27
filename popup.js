"use strict";
// Popup: fetch Gmail's unread-inbox atom feeds (cookie-authed, server-side
// fresh — no Gmail tab needed), rank via OtpPeek (extractor.js), render.

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const ACCOUNT_SLOTS = 3;

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = false;
}

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

function render(ranked) {
  for (const item of ranked) {
    const button = document.createElement("button");
    button.className = "row";
    const code = document.createElement("span");
    code.className = "code";
    code.textContent = item.code;
    const meta = document.createElement("span");
    meta.className = "meta";
    const age = item.ts ? OtpPeek.ageStr((Date.now() - item.ts) / 1000) : "";
    meta.textContent = age ? `${item.sender} · ${age}` : item.sender;
    button.append(code, meta);
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.code);
      code.textContent = "Copied ✓";
      setTimeout(() => window.close(), 700);
    });
    listEl.append(button);
  }
}

async function init() {
  const { rows, anyFeed } = await collectRows();
  if (!anyFeed) {
    showStatus("Sign in to Gmail in this browser first.");
    return;
  }
  const ranked = OtpPeek.rankRows(rows, Date.now()).slice(0, 3);
  if (ranked.length === 0) {
    showStatus("No unread OTP in the last 20 minutes.");
    return;
  }
  render(ranked);
}

init();
