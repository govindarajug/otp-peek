# Store listing copy

Paste-ready text for the Chrome Web Store and addons.mozilla.org (AMO).
Images live next to this file (sources: `screenshot.html`, `promo-tile.html`,
`../icons/icon.svg`; render with `npm run assets`).

| Asset | File | Store |
| --- | --- | --- |
| Icon 128×128 | `icons/icon-128.png` | Chrome, AMO |
| Screenshot 1280×800 | `store/screenshot-1280x800.png` | Chrome, AMO |
| Small promo tile 440×280 | `store/promo-tile-440x280.png` | Chrome |

## Name

OTP Peek

## Summary (≤132 chars; Chrome "short description", AMO "summary")

Shows your newest Gmail OTP. Click or hotkey to copy. No Gmail tab needed; nothing leaves your browser.

## Category

- Chrome: Productivity → Tools
- AMO: Privacy & Security (or Other)

## Description

Stop switching to Gmail and hunting for the code mid-login.

Click the OTP Peek toolbar icon and the newest one-time codes from your Gmail
appear: code, sender, and how long ago it arrived. Click one and it's on your
clipboard. Or skip the popup and press Alt+Shift+C (Option+Shift+C on Mac) to
copy the newest code directly; the icon flashes ✓ when it's done.

• Works with personal Gmail and Google Workspace, up to three signed-in accounts
• No setup: no Google Cloud project, no OAuth, no account connection, no Gmail tab
• Finds digit codes and letter-number codes; ignores phone numbers, prices, and years
• Looks back 20 minutes, shows the top three

Private by design:
• Read-only: it cannot send, delete, or mark mail
• Reads only the unread-inbox feed (subject, snippet, sender), never full messages
• Nothing is stored and nothing leaves your browser; the only host it contacts is mail.google.com
• No analytics, no ads, no servers
• Open source, a few hundred lines, no dependencies:
  https://github.com/govindarajug/otp-peek

Note: codes come from unread mail. If you've already opened the email in
Gmail, the code won't show.

## Links

- Homepage / support: https://github.com/govindarajug/otp-peek
- Support / issues: https://github.com/govindarajug/otp-peek/issues
- Privacy policy: https://github.com/govindarajug/otp-peek/blob/main/PRIVACY.md

## Chrome Web Store: Privacy practices tab

**Single purpose:**
Show the newest one-time login codes from the user's unread Gmail inbox and
copy the chosen code to the clipboard.

**Permission justifications:**

- `clipboardWrite`: Copies the one-time code the user clicks (or the newest
  code, when the user presses the copy hotkey) to the clipboard. This is the
  extension's core action.
- `offscreen`: The copy hotkey runs in the background service worker, which
  has no clipboard access. An offscreen document with reason CLIPBOARD is the
  Chrome-supported way to write the code to the clipboard from there. It
  renders nothing and makes no network requests.
- Host permission `https://mail.google.com/*`: Fetches Gmail's
  unread-inbox Atom feed (`/mail/u/N/feed/atom`) using the user's existing
  Gmail session, to find recent one-time codes. No other host is contacted,
  no content scripts are injected, and no page is modified.

**Remote code:** No, I am not using remote code. All JavaScript ships in the
package.

**Data usage:** check **Personal communications** (the extension reads email
subjects, snippets, and senders, locally in the browser, to find codes).
Leave everything else unchecked. Certify all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the PRIVACY.md link above.

## AMO: submission notes

**Data collection:** the manifest declares
`data_collection_permissions.required: ["none"]`. Nothing is transmitted off
the device; mail data is processed in memory only.

**Source code:** not required. The package contains the unminified,
unbundled source exactly as in the repository; there is no build step.

**Notes to reviewer:**

> OTP Peek fetches https://mail.google.com/mail/u/{0,1,2}/feed/atom with the
> user's existing Gmail cookies (host permission is requested at runtime from
> the popup with a "Grant Gmail access" button, as MV3 host permissions are
> opt-in in Firefox). The Atom feed is parsed with regexes in extractor.js;
> one-time codes are ranked by proximity to keywords like "code" and shown in
> the popup. Clicking a code, or pressing Alt+Shift+C, writes it to the
> clipboard. Nothing is stored, and no other host is contacted.
>
> To test: sign into any Gmail account in the browser, send that account an
> email with subject "Your verification code is 482913", click the toolbar
> icon, grant access, and the code appears.
