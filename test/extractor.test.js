"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const { extractCodes, rankRows, ageStr } = require("../extractor.js");

test("six digit code near keyword", () => {
  assert.deepEqual(extractCodes("Your verification code is 123456"), ["123456"]);
});

test("keyword after number, GitHub style", () => {
  assert.deepEqual(extractCodes("824119 is your GitHub authentication code."), ["824119"]);
});

test("Google G- prefix kept (letter-hyphen is not a phone run)", () => {
  assert.deepEqual(extractCodes("G-482913 is your Google verification code."), ["482913"]);
});

test("phone number fragments excluded", () => {
  const codes = extractCodes("Call us at 415-555-0142. Your code is 9384");
  assert.equal(codes[0], "9384");
  assert.ok(!codes.includes("0142"));
});

test("copyright year excluded", () => {
  const codes = extractCodes("Your login code: 774431\n© 2026 Acme Inc.");
  assert.equal(codes[0], "774431");
  assert.ok(!codes.includes("2026"));
});

test("uppercase alphanumeric code", () => {
  assert.deepEqual(extractCodes("Your one-time passcode: 8XK2P9"), ["8XK2P9"]);
});

test("no digits, no codes", () => {
  assert.deepEqual(extractCodes("Please verify your account by clicking"), []);
});

test("currency amount excluded", () => {
  const codes = extractCodes("Your payment of $4299 is due. Approval code 5521");
  assert.equal(codes[0], "5521");
  assert.ok(!codes.includes("4299"));
});

test("number without any keyword ignored", () => {
  assert.deepEqual(extractCodes("Meeting in room 40218 tomorrow"), []);
});

const NOW = 1_000_000_000_000;
const MIN = 60_000;
const row = (tsOffsetMin, snippet, sender = "A") => ({
  subject: "",
  snippet,
  sender,
  ts: tsOffsetMin === null ? null : NOW - tsOffsetMin * MIN,
});

test("rankRows: newest code first", () => {
  const ranked = rankRows(
    [row(10, "Your code is 111111", "Old"), row(1, "Your code is 222222", "New")],
    NOW
  );
  assert.equal(ranked[0].code, "222222");
  assert.equal(ranked[0].sender, "New");
  assert.equal(ranked[1].code, "111111");
});

test("rankRows: codeless rows dropped", () => {
  const ranked = rankRows([row(1, "Thanks for signing up!"), row(5, "code 333333")], NOW);
  assert.deepEqual(ranked.map((r) => r.code), ["333333"]);
});

test("rankRows: rows older than 20m dropped", () => {
  assert.deepEqual(rankRows([row(25, "Your code is 444444")], NOW), []);
});

test("rankRows: code in subject counts", () => {
  const r = { subject: "123987 is your login code", snippet: "", sender: "X", ts: NOW - MIN };
  assert.equal(rankRows([r], NOW)[0].code, "123987");
});

test("rankRows: unparseable timestamp kept but ranked last", () => {
  const ranked = rankRows(
    [row(null, "Your code is 555555", "NoDate"), row(2, "Your code is 666666", "Dated")],
    NOW
  );
  assert.deepEqual(ranked.map((r) => r.code), ["666666", "555555"]);
});

test("rankRows: empty input gives empty output", () => {
  assert.deepEqual(rankRows([], NOW), []);
});

test("ageStr seconds", () => {
  assert.equal(ageStr(40), "40s ago");
});

test("ageStr minutes", () => {
  assert.equal(ageStr(200), "3m ago");
});

test("ageStr hours", () => {
  assert.equal(ageStr(7200), "2h ago");
});

const { parseFeed } = require("../extractor.js");

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed version="0.3" xmlns="http://purl.org/atom/ns#">
<title>Gmail - Inbox for g@x.io</title>
<entry><title>824119 is your GitHub code</title><summary>824119 is your GitHub authentication code.</summary><issued>2026-08-27T09:00:00Z</issued><author><name>GitHub</name><email>noreply@github.com</email></author></entry>
<entry><title>Your Slack sign-in code</title><summary>Confirmation code: 774431</summary><issued>2026-08-27T09:05:00Z</issued><author><name>Slack</name><email>no-reply@slack.com</email></author></entry>
</feed>`;

test("parseFeed: maps entries to rows", () => {
  const rows = parseFeed(FEED);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].subject, "824119 is your GitHub code");
  assert.equal(rows[0].snippet, "824119 is your GitHub authentication code.");
  assert.equal(rows[0].sender, "GitHub");
  assert.equal(rows[0].ts, Date.parse("2026-08-27T09:00:00Z"));
});

test("parseFeed: unescapes XML entities", () => {
  const xml = `<feed><entry><title>Tom &amp; Co &#8217;s code 5599</title><summary>&lt;b&gt;</summary><issued>2026-08-27T09:00:00Z</issued><author><name>Tom &amp; Co</name></author></entry></feed>`;
  const rows = parseFeed(xml);
  assert.equal(rows[0].subject, "Tom & Co ’s code 5599");
  assert.equal(rows[0].snippet, "<b>");
  assert.equal(rows[0].sender, "Tom & Co");
});

test("parseFeed: missing issued gives null ts", () => {
  const rows = parseFeed(`<feed><entry><title>code 1234</title><summary>s</summary><author><name>A</name></author></entry></feed>`);
  assert.equal(rows[0].ts, null);
});

test("parseFeed: author email used when name missing", () => {
  const rows = parseFeed(`<feed><entry><title>t</title><summary>s</summary><issued>2026-08-27T09:00:00Z</issued><author><email>x@y.io</email></author></entry></feed>`);
  assert.equal(rows[0].sender, "x@y.io");
});

test("parseFeed: empty feed gives empty rows", () => {
  assert.deepEqual(parseFeed(`<?xml version="1.0"?><feed><title>Inbox</title></feed>`), []);
});

test("extractCodes: two candidates ranked by keyword distance", () => {
  assert.deepEqual(extractCodes("code 111222 and later somewhere else 333444"), [
    "111222",
    "333444",
  ]);
});

test("parseFeed: hex numeric entity unescaped", () => {
  const rows = parseFeed(`<feed><entry><title>It&#x27;s your code 4455</title><summary>s</summary><issued>2026-08-27T09:00:00Z</issued><author><name>A</name></author></entry></feed>`);
  assert.equal(rows[0].subject, "It's your code 4455");
});

test("parseFeed: unknown named entity kept literal", () => {
  const rows = parseFeed(`<feed><entry><title>code&nbsp;7788</title><summary>s</summary><issued>2026-08-27T09:00:00Z</issued><author><name>A</name></author></entry></feed>`);
  assert.equal(rows[0].subject, "code&nbsp;7788");
});

test("parseFeed: unparseable numeric entity kept literal", () => {
  const rows = parseFeed(`<feed><entry><title>code 9911 &#ff;</title><summary>s</summary><issued>2026-08-27T09:00:00Z</issued><author><name>A</name></author></entry></feed>`);
  assert.equal(rows[0].subject, "code 9911 &#ff;");
});

test("year-shaped code without copyright/month context is kept", () => {
  assert.deepEqual(extractCodes("Your verification code is 2043"), ["2043"]);
});

test("candidate farther than 200 chars from any keyword ignored", () => {
  const filler = "x".repeat(210);
  assert.deepEqual(extractCodes(`code ${filler} 40218`), []);
});

test("duplicate code counted once with best score", () => {
  assert.deepEqual(extractCodes("code 111222 and again 111222"), ["111222"]);
});

test("all-caps word without digits ignored", () => {
  assert.deepEqual(extractCodes("Use code WINTER at checkout"), []);
});

test("number followed by hyphen-digit run excluded, hyphen-letter kept", () => {
  assert.deepEqual(extractCodes("code 1234-5678 ref"), []);
  assert.deepEqual(extractCodes("code 12345-A ref"), ["12345"]);
});

test("rankRows: two null-ts rows keep insertion order", () => {
  const a = { subject: "code 111111", snippet: "", sender: "A", ts: null };
  const b = { subject: "code 222222", snippet: "", sender: "B", ts: null };
  assert.deepEqual(otp_rankRowsCodes([a, b]), ["111111", "222222"]);
});

function otp_rankRowsCodes(rows) {
  return rankRows(rows, NOW).map((r) => r.code);
}
