# otp-peek — spec (Chrome extension, Gmail feed reader)

v1 approved 2026-08-27 (Gmail-tab DOM scraper); v1.1 approved same day —
feed transport replaces the tab scraper after "must keep a Gmail tab open
and reload it" feedback. Still: no GCP project, no OAuth, no Google setup.

## Data path (v1.1)
1. Popup opens → `fetch("https://mail.google.com/mail/u/N/feed/atom")` for
   account slots N = 0..2, `credentials: "include"` (session cookie auth).
   Server-side fresh every click — no Gmail tab, no reload. Signed-out
   slots return login HTML (no `<feed`) and are skipped; responses are
   deduped by `ts|subject` across slots.
2. `parseFeed` (pure, regex-based — the Atom 0.3 feed is flat escaped text,
   and node --test has no DOMParser) maps entries to rows: subject/title,
   snippet/summary, sender/author, ts from ISO `<issued>` (locale-proof).
3. Popup filters rows to last 20 min (null ts kept, ranked last), runs the
   extractor, renders top 3: code, sender, age.
4. Click row → `navigator.clipboard.writeText`, "copied", popup closes.

Feed lists **unread** inbox mail only — OTPs are unread on arrival. v1.0's
content-script scraper (git history) is the fallback design if Google ever
retires the feed.

## Extractor (pure, tested)
- Digit candidates `\b\d{4,8}\b`; uppercase alphanumeric `\b[A-Z0-9]{5,8}\b`
  (must mix digits+letters, +10 rank penalty).
- Ranked by distance to nearest keyword (code/otp/passcode/verification/
  verify/one-time/2fa/pin/login/sign-in/auth*); no keyword in text → no codes.
- Filters: digit-runs joined by `-`/`.` (phones), currency-prefixed amounts,
  4-digit years 1900–2099 preceded (≤12 chars) by ©/(c)/copyright/month name.
- `rankRows(rows, nowMs)` → rows-with-best-code, newest first, cutoff 20 min.

## Cross-browser (v1.2)
- One manifest for both engines: `browser_specific_settings.gecko` (id,
  min 140, no data collection; `gecko_android` min 142) is Firefox-only and merely warns in Chrome.
- Popup uses no `chrome.*`/`browser.*` APIs except `permissions`, accessed
  via `globalThis.browser ?? globalThis.chrome`.
- Firefox MV3 host permissions are opt-in → popup gates on
  `permissions.contains`, offers a one-click `permissions.request` (user
  gesture) before first fetch. Chrome: contains() is true at install.
- Firefox container tabs keep Gmail cookies in container jars the extension
  can't read — documented, not solvable in code.

## Hotkey (v1.3)
- `commands.copy-latest-otp`, default Alt+Shift+C, headless: background
  script reuses feed.js + extractor, copies top code, flashes action badge
  (✓ copied / × none / ! error-or-ungranted) for 3s.
- Cross-browser background: manifest declares both `service_worker`
  (Chrome: `background-chrome.js`, which importScripts the shared files)
  and `scripts` (Firefox event page: the shared files directly).
- Clipboard from background: Firefox event page writes directly
  (clipboardWrite); Chrome service worker relays to an offscreen document
  (reason CLIPBOARD, execCommand — navigator.clipboard needs focus). The
  relay, `copyViaOffscreen`, lives in `background-chrome.js` so the Firefox
  zip has no `offscreen` calls for AMO's linter to flag.
- Transport shared via feed.js (fetchFeed/collectRows moved out of popup.js).

## Store publishing (v1.4)
- Icons: `icons/icon.svg` source → 16/32/48/128 PNGs (committed), wired to
  manifest `icons` + `action.default_icon`. Store art in `store/` is HTML
  rendered to PNG; `npm run assets` drives headless Chrome via CDP (Node 22
  built-in WebSocket), so still no dependencies.
- Source manifest stays cross-browser for unpacked loading. `npm run package`
  emits per-store zips with trimmed manifests (Chrome: drop gecko settings +
  `background.scripts`, add `minimum_chrome_version` 109 for offscreen;
  Firefox: drop `service_worker` + `offscreen`) and an allowlist of runtime
  files. Hand-rolled deflate zip writer (zlib + crc32), fixed timestamps →
  reproducible builds. Not a build step: shipped JS is the source verbatim.
- `test/package.test.js` gates the allowlist against manifest/HTML/
  importScripts references and the manifest/package.json version match.
- Tag `vX.Y.Z` → `release` workflow: tests, package (tag must equal the
  manifest version), GitHub Release with both zips. Store upload is manual
  (`docs/publishing.md`); listing copy + permission justifications in
  `store/listing.md`; privacy policy in `PRIVACY.md`.

## Permissions & security
- `host_permissions`: `https://mail.google.com/*` only.
- `permissions`: `clipboardWrite` + `offscreen` (Chrome-internal clipboard
  relay; Firefox ignores it). `scripting` + content script dropped in v1.1.
- No storage, no remote code, no hosts beyond mail.google.com; codes fetched
  live per popup open, never persisted.

## States
- No Gmail session cookie → "Sign in to Gmail in this browser first."
- Nothing recent/unread → "No unread OTP in the last 20 minutes."

## Known tradeoffs
- Unread-only: a code already read in Gmail stops appearing.
- Legacy feed endpoint is Google's to retire; scraper design in git history
  is the fallback.

## Testing
- `node --test test/extractor.test.js` on extractor + feed parser (dual
  browser-global/CJS export).
- Fetch + popup glue: manual (load unpacked, live Gmail).

## Out of scope v1
- Auto-fill into OTP fields, non-Gmail providers. (Icons + store
  publishing landed in v1.4.)
