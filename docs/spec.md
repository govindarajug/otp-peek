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
  min 128, no data collection) is Firefox-only and merely warns in Chrome.
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
  (Chrome) and `scripts` (Firefox event page); Chrome side importScripts
  the shared files, guarded on `typeof OtpPeek`.
- Clipboard from background: Firefox event page writes directly
  (clipboardWrite); Chrome service worker relays to an offscreen document
  (reason CLIPBOARD, execCommand — navigator.clipboard needs focus).
- Transport shared via feed.js (fetchFeed/collectRows moved out of popup.js).

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
- Auto-fill into OTP fields, icons, store publishing, non-Gmail providers.
