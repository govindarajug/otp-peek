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
