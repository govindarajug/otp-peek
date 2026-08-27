# OTP Peek

Chrome extension: click the toolbar icon, see the newest OTP from your open
Gmail tab, click it — it's on your clipboard.

Zero setup: no Google Cloud project, no OAuth, no account connection. It reads
the inbox list of the Gmail tab you already have open. Nothing is stored,
nothing leaves the browser; the extension can touch `mail.google.com` and
nothing else.

## Install (load unpacked)

1. Chrome → `chrome://extensions` → toggle **Developer mode** (top right).
2. **Load unpacked** → select this repo directory.
3. Pin **OTP Peek** to the toolbar (puzzle icon → pin).

## Use

Keep a Gmail tab open (pinned tab works). Trigger a login that emails you a
code → click the OTP Peek icon → newest codes appear (code, sender, age) →
click one → pasted-ready. Looks back 20 minutes, top 3 shown.

Messages you might see:

- `Open mail.google.com first` — no Gmail tab anywhere.
- `No OTP in the last 20 minutes` — mail not arrived/loaded yet; Gmail tab
  must be showing the inbox list for new mail to appear in it.
- `Couldn't read the Gmail tab` — tab was asleep; click it once, retry.

## How it works

`content.js` scrapes the Gmail inbox list rows (subject, snippet preview,
sender, timestamp) — selectors only. `extractor.js` ranks candidate codes by
keyword proximity and filters years, phone-number fragments, and currency
amounts. `popup.js` shows the top 3 from the last 20 minutes.

Known tradeoff: Gmail's classnames (`tr.zA`, `.bog`, `.y2`, `.xW`) are
Google's to change; if the popup goes quiet after a Gmail redesign, the fix
lives in one function in `content.js`.

## Development

```sh
node --test test/extractor.test.js
```

All extraction/ranking logic is pure and tested; content-script and popup
glue is verified manually against live Gmail. Design notes: `docs/spec.md`.
