"use strict";
// Pure OTP extraction/ranking. Loaded as a classic script by popup.html
// (global `OtpPeek`) and as CJS by node --test.

const KEYWORD_RE =
  /\b(code|otp|passcode|password|verification|verify|one[- ]?time|2fa|pin|login|sign[- ]?in|auth\w*)\b/gi;
const DIGIT_CODE_RE = /\b\d{4,8}\b/g;
const ALNUM_CODE_RE = /\b[A-Z0-9]{5,8}\b/g;
const YEAR_CONTEXT_RE = /(©|\(c\)|copyright|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
const MAX_KEYWORD_DISTANCE = 200;
const LOOKBACK_MS = 20 * 60 * 1000;

function extractCodes(text) {
  const keywordPositions = [...text.matchAll(KEYWORD_RE)].map((m) => m.index);
  if (keywordPositions.length === 0) return [];
  const scored = new Map();
  for (const { match, penalty } of candidates(text)) {
    const distance = Math.min(...keywordPositions.map((p) => Math.abs(match.index - p)));
    if (distance > MAX_KEYWORD_DISTANCE) continue;
    const code = match[0];
    const score = distance + penalty;
    if (!scored.has(code) || score < scored.get(code)) scored.set(code, score);
  }
  return [...scored.entries()].sort((a, b) => a[1] - b[1]).map(([code]) => code);
}

function* candidates(text) {
  for (const m of text.matchAll(DIGIT_CODE_RE)) {
    if (inDigitRun(text, m) || isCurrency(text, m) || isYear(text, m)) continue;
    yield { match: m, penalty: 0 };
  }
  for (const m of text.matchAll(ALNUM_CODE_RE)) {
    if (/\d/.test(m[0]) && /[A-Z]/.test(m[0])) yield { match: m, penalty: 10 };
  }
}

function inDigitRun(text, m) {
  const start = m.index;
  const end = m.index + m[0].length;
  const before =
    start >= 2 && "-.".includes(text[start - 1]) && /\d/.test(text[start - 2]);
  const after =
    end + 1 < text.length && "-.".includes(text[end]) && /\d/.test(text[end + 1]);
  return before || after;
}

function isCurrency(text, m) {
  return m.index > 0 && "$€£₹".includes(text[m.index - 1]);
}

function isYear(text, m) {
  const v = m[0];
  if (v.length !== 4) return false;
  const n = Number(v);
  if (n < 1900 || n > 2099) return false;
  return YEAR_CONTEXT_RE.test(text.slice(Math.max(0, m.index - 12), m.index));
}

function rankRows(rows, nowMs) {
  const cutoff = nowMs - LOOKBACK_MS;
  const ranked = [];
  for (const r of rows) {
    if (r.ts !== null && r.ts < cutoff) continue;
    const codes = extractCodes(`${r.subject}\n${r.snippet}`);
    if (codes.length) ranked.push({ ...r, code: codes[0] });
  }
  return ranked.sort((a, b) => (b.ts ?? -Infinity) - (a.ts ?? -Infinity));
}

function ageStr(seconds) {
  seconds = Math.floor(seconds);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// Gmail's legacy inbox atom feed (Atom 0.3) is flat escaped text — no CDATA,
// no attributes on the tags we read — so targeted regexes beat a DOM parser
// and keep this testable under node --test (which has no DOMParser).
const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function unescapeXml(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, entity) => {
    if (entity[0] !== "#") return XML_ENTITIES[entity] ?? whole;
    const codePoint = entity[1] === "x"
      ? parseInt(entity.slice(2), 16)
      : parseInt(entity.slice(1), 10);
    return Number.isNaN(codePoint) ? whole : String.fromCodePoint(codePoint);
  });
}

function tagText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? unescapeXml(m[1]).trim() : "";
}

function parseFeed(xmlText) {
  const rows = [];
  for (const m of xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = m[1];
    const issued = tagText(entry, "issued");
    const parsed = Date.parse(issued);
    rows.push({
      subject: tagText(entry, "title"),
      snippet: tagText(entry, "summary"),
      sender: tagText(entry, "name") || tagText(entry, "email"),
      ts: Number.isNaN(parsed) ? null : parsed,
    });
  }
  return rows;
}

const OtpPeek = { extractCodes, rankRows, ageStr, parseFeed, LOOKBACK_MS };
if (typeof module !== "undefined" && module.exports) {
  module.exports = OtpPeek;
}
