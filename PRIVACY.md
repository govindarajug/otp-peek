# OTP Peek privacy policy

Effective 2026-10-05. Applies to the OTP Peek browser extension in every
browser and store it is distributed through.

## Short version

OTP Peek reads your unread Gmail inbox feed **inside your browser** to find
one-time login codes. Nothing it reads is stored, and nothing is sent anywhere
except the request to Gmail itself. There are no analytics, ads, accounts, or
servers.

## What the extension accesses

When you open the popup or press the copy hotkey, the extension requests
`https://mail.google.com/mail/u/N/feed/atom` (N = 0, 1, 2) with your browser's
existing Gmail session. Google returns, for **unread inbox mail only**:

- subject line
- a short snippet preview of the body
- sender name and address
- received time

It does not access full message bodies, read mail, other labels, attachments,
contacts, or your Google password, and it cannot send, delete, or modify mail.

## How that data is used

Solely to find and show one-time codes from the last 20 minutes. The feed is
parsed in memory, the top three codes are shown in the popup (or the newest
one is copied, for the hotkey), and everything is discarded when the popup
closes or the hotkey action finishes.

When you click a code or press the hotkey, that code is written to your
system clipboard. That is the only thing the extension writes anywhere.

## What is stored

Nothing. The extension does not use extension storage, cookies of its own,
IndexedDB, or any other persistence. It keeps no history of codes or mail.

## What is shared

Nothing. The only network host the extension contacts is `mail.google.com`,
the same Gmail service you are already signed into. No data is sent to the
developer or any third party, and no data is sold, transferred, or used for
advertising, credit decisions, or any purpose other than the single feature
described above.

## Permissions

- **Access to `mail.google.com`** — to fetch the unread-inbox feed above.
- **`clipboardWrite`** — to copy the chosen code.
- **`offscreen`** (Chrome only) — lets the hotkey reach the clipboard from the
  background worker; it opens no visible page and has no network access.

## Verifying this

The extension is open source and small enough to read in one sitting:
<https://github.com/govindarajue6data/otp-peek>.

## Changes and contact

Changes to this policy are published in the repository above, with history.
Questions: open an issue on the repository. Security problems: use the
repository's private vulnerability reporting (see `SECURITY.md`).
