# OTP Peek

Chrome extension: click the toolbar icon, see the newest OTP from your Gmail,
click it — it's on your clipboard. No more switching to Gmail and hunting for
the code mid-login.

Zero setup: no Google Cloud project, no OAuth, no account connection, no
Gmail tab needed. It reads Gmail's cookie-authenticated unread-inbox feed,
which is fresh from the server on every click.

## Requirements

- Chrome or any Chromium browser (Edge, Brave, Arc), **or** Firefox 128+ and
  Firefox-based browsers (Zen, LibreWolf, Floorp, Waterfox).
- Signed into Gmail in that browser — personal `@gmail.com` and Google
  Workspace accounts both work. Nothing else.

## Install

```sh
git clone https://github.com/govindarajue6data/otp-peek.git
```

### Chrome / Chromium

1. Go to `chrome://extensions` and toggle **Developer mode** (top right).
2. Click **Load unpacked** and select the cloned `otp-peek` directory.
3. Pin **OTP Peek** to the toolbar (puzzle icon → pin).

To update later: `git pull`, then `chrome://extensions` → OTP Peek →
**Reload**. (Chrome may warn about the `browser_specific_settings` manifest
key — that's the Firefox section, safe to ignore.)

### Firefox / Firefox-based

1. Go to `about:debugging` → **This Firefox** → **Load Temporary Add-on** →
   pick `manifest.json` in the cloned directory.
2. Click the OTP Peek icon → click **Grant Gmail access** once (Firefox
   treats host permissions as opt-in; Chrome grants them at install).

Firefox notes:

- Temporary add-ons unload when Firefox restarts — reload from
  `about:debugging` after a restart. For a permanent install, Firefox-based
  browsers and Firefox Developer Edition/ESR let you flip
  `xpinstall.signatures.required` to `false` in `about:config` and install
  the directory zipped as an `.xpi`; release Firefox requires AMO signing.
- Using Multi-Account Containers: sign into Gmail in a normal (no-container)
  tab too — the extension reads the default cookie jar, not container jars.

## Use

Trigger a login that emails you a code → click the OTP Peek icon → the newest
codes appear (code, sender, age) → click one → it's on your clipboard, paste
it. Looks back 20 minutes, shows top 3, covers your first three signed-in
Google accounts.

Messages you might see:

- `Sign in to Gmail in this browser first` — no Gmail session in this
  browser profile.
- `No unread OTP in the last 20 minutes` — the mail hasn't arrived yet
  (click the icon again), or you already opened the mail in Gmail — the feed
  lists **unread** mail only.

## Is it safe? What can it see?

Short version: less than any Gmail tab you already have open.

- It fetches Gmail's unread-inbox feed — **subject, snippet preview, sender,
  date of unread inbox mail**. It never sees full message bodies, read mail,
  or other labels.
- **Read-only.** It cannot send, delete, or mark mail.
- **Nothing is stored** — no history, no code cache; every popup open reads
  live and forgets on close.
- **Nothing leaves your browser.** The only host it may contact is
  `mail.google.com`; there is no analytics, no third-party server.
- Permissions in `manifest.json`: `clipboardWrite` + host access to
  `mail.google.com`. That's the whole list.
- Small enough to audit yourself before installing: `popup.js` (fetch +
  render) and `extractor.js` (code ranking) — a few hundred lines, no
  dependencies, no build step.

## How it works

`popup.js` fetches the atom feed for account slots `u/0..2`. `extractor.js`
parses entries and ranks candidate codes by proximity to keywords like
"code" / "verification", filtering out years, phone-number fragments, and
currency amounts. Top 3 from the last 20 minutes render in the popup;
clicking copies.

Known tradeoffs:

- Unread-only: a code you already read in Gmail stops showing. In the normal
  flow you copy it before ever opening the mail, so this rarely bites.
- More than three Google accounts in one profile: bump `ACCOUNT_SLOTS` in
  `popup.js`.
- The feed is an ancient Google endpoint and Google's to retire; v1.0's
  Gmail-tab DOM scraper (git history) is the fallback design if that day
  comes.

## Development

```sh
node --test test/extractor.test.js
```

All parsing/extraction/ranking logic is pure and tested; the fetch + popup
glue is verified manually against live Gmail. Design notes: `docs/spec.md`.
