"use strict";
// Popup: fetch Gmail's unread-inbox atom feeds (cookie-authed, server-side
// fresh — no Gmail tab needed), rank via OtpPeek (extractor.js), render.

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const ACCOUNT_SLOTS = 3;
const FEED_ORIGINS = ["https://mail.google.com/*"];
const ext = globalThis.browser ?? globalThis.chrome;

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

// Chrome grants host_permissions at install; Firefox MV3 makes them opt-in,
// so first run needs a one-click grant (request must run in a user gesture).
async function ensureHostPermission() {
  if (await ext.permissions.contains({ origins: FEED_ORIGINS })) return true;
  return new Promise((resolve) => {
    const button = document.createElement("button");
    button.className = "row";
    button.textContent = "Grant Gmail access";
    button.addEventListener("click", async () => {
      const granted = await ext.permissions.request({ origins: FEED_ORIGINS });
      if (granted) {
        button.remove();
        statusEl.hidden = true;
      }
      resolve(granted);
    });
    showStatus("One-time permission needed to read your Gmail feed.");
    listEl.append(button);
  });
}

async function init() {
  if (!(await ensureHostPermission())) return;
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
