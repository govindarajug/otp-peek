# otp-peek — spec (Chrome extension, Gmail-tab reader)

Approved 2026-08-27. Supersedes the aborted Raycast/Gmail-API lane: no GCP
project, no OAuth, no Google setup of any kind.

## Data path
1. Popup opens → `chrome.tabs.query` for `https://mail.google.com/*` tabs.
2. Content script (auto-injected via `scripting` if the tab predates install)
   scrapes inbox list rows — subject `.bog`, snippet `.y2`, timestamp
   `.xW span[title]`, sender `span[email]` — selectors only, no logic.
3. Popup filters rows to last 20 min (unparseable/locale timestamps kept,
   ranked last), runs the extractor, renders top 3: code, sender, age.
4. Click row → `navigator.clipboard.writeText`, "copied", popup closes.

## Extractor (pure, tested)
- Digit candidates `\b\d{4,8}\b`; uppercase alphanumeric `\b[A-Z0-9]{5,8}\b`
  (must mix digits+letters, +10 rank penalty).
- Ranked by distance to nearest keyword (code/otp/passcode/verification/
  verify/one-time/2fa/pin/login/sign-in/auth*); no keyword in text → no codes.
- Filters: digit-runs joined by `-`/`.` (phones), currency-prefixed amounts,
  4-digit years 1900–2099 preceded (≤12 chars) by ©/(c)/copyright/month name.
- `rankRows(rows, nowMs)` → rows-with-best-code, newest first, cutoff 20 min.

## Permissions & security
- `host_permissions`: `https://mail.google.com/*` only.
- `permissions`: `scripting` (inject into pre-existing Gmail tabs),
  `clipboardWrite`.
- No storage, no network calls, no remote code; codes read live per popup
  open, never persisted.

## States
- No Gmail tab → "open mail.google.com". No recent code → "no OTP in last 20m".

## Known tradeoffs
- Gmail classnames are Google's to break; all selectors live in one function.
- Needs a Gmail tab open (pinned tab works).
- Timestamp parsing assumes English Gmail locale; other locales degrade to
  unranked-by-age, not broken.

## Testing
- `node --test test/` on the extractor (dual browser-global/CJS export).
- Content script + popup glue: manual (load unpacked, live Gmail).

## Out of scope v1
- Auto-fill into OTP fields, icons, store publishing, non-Gmail providers.
