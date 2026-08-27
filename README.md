# OTP Peek

Chrome extension: click the toolbar icon, see the newest OTP from your Gmail,
click it — it's on your clipboard.

Zero setup: no Google Cloud project, no OAuth, no account connection, and
since v1.1 **no Gmail tab needed** — it reads Gmail's cookie-authenticated
unread-inbox feed (`mail.google.com/mail/u/N/feed/atom`), which is fresh from
the server on every click. Nothing is stored, nothing leaves the browser; the
extension can touch `mail.google.com` and nothing else.

## Install (load unpacked)

1. Chrome → `chrome://extensions` → toggle **Developer mode** (top right).
2. **Load unpacked** → select this repo directory.
3. Pin **OTP Peek** to the toolbar (puzzle icon → pin).

Already installed? `chrome://extensions` → OTP Peek → **Reload** after pulling
this version.

## Use

Be signed into Gmail in Chrome (a tab is not required). Trigger a login that
emails you a code → click the OTP Peek icon → newest codes appear (code,
sender, age) → click one → pasted-ready. Looks back 20 minutes, top 3 shown,
first three signed-in Google accounts covered.

Messages you might see:

- `Sign in to Gmail in this browser first` — no Gmail session cookie.
- `No unread OTP in the last 20 minutes` — mail not arrived yet, or the OTP
  mail was already opened/read (the feed lists unread mail only).

## How it works

`popup.js` fetches the atom feed for account slots `u/0..2`, `extractor.js`
parses entries (subject, snippet, sender, ISO timestamp) and ranks candidate
codes by keyword proximity, filtering years, phone-number fragments, and
currency amounts. Top 3 from the last 20 minutes render in the popup.

Known tradeoffs: unread-only (a code you've already read in Gmail stops
showing — usually irrelevant, you copy before reading); the feed endpoint is
ancient and Google's to retire — v1.0's Gmail-tab DOM scraper lives in git
history as a fallback design.

## Development

```sh
node --test test/extractor.test.js
```

All parsing/extraction/ranking logic is pure and tested; the fetch + popup
glue is verified manually against live Gmail. Design notes: `docs/spec.md`.
