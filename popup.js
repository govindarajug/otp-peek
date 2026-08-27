"use strict";
// Popup: pull rows from Gmail tabs, rank via OtpPeek (extractor.js), render.

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = false;
}

async function getRowsFromTab(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "getRows" });
    return resp.rows;
  } catch {
    // Tab predates install — inject, then retry once.
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    const resp = await chrome.tabs.sendMessage(tabId, { type: "getRows" });
    return resp.rows;
  }
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
  const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
  if (tabs.length === 0) {
    showStatus("Open mail.google.com first, then try again.");
    return;
  }
  const rows = [];
  let failedTabs = 0;
  for (const tab of tabs) {
    try {
      rows.push(...(await getRowsFromTab(tab.id)));
    } catch {
      failedTabs += 1;
    }
  }
  const ranked = OtpPeek.rankRows(rows, Date.now()).slice(0, 3);
  if (ranked.length === 0) {
    showStatus(
      rows.length === 0 && failedTabs > 0
        ? "Couldn't read the Gmail tab — click it once, then retry."
        : "No OTP in the last 20 minutes."
    );
    return;
  }
  render(ranked);
}

init();
