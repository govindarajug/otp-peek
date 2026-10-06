# Publishing OTP Peek

How a version gets from `main` to the Chrome Web Store (CWS) and
addons.mozilla.org (AMO). Listing text, permission justifications and
reviewer notes to paste are in `store/listing.md`.

## What gets uploaded

`npm run package` writes two zips to `dist/` (git-ignored):

| Zip | Store | Manifest differences from the source `manifest.json` |
| --- | --- | --- |
| `otp-peek-chrome-<ver>.zip` | CWS (also Edge Add-ons, Opera) | no `browser_specific_settings`, no `background.scripts`; adds `minimum_chrome_version: 109` |
| `otp-peek-firefox-<ver>.zip` | AMO | no `background.service_worker`, no `offscreen` permission or offscreen files |

The source tree is still the cross-browser manifest you load unpacked; the
packaging step only trims each store's copy and ships an allowlist of runtime
files (`TARGETS` in `scripts/package.js`). Tests, docs, store art and CI
config never reach a store. `test/package.test.js` fails if the manifest or
HTML references a file the allowlist doesn't ship. Zips are byte-for-byte
reproducible (fixed timestamps).

## Release checklist

1. Bump `version` in **both** `manifest.json` and `package.json` (a test and
   the packager both refuse a mismatch). Stores reject re-uploading a
   version they've seen.
2. `npm test && npm run coverage && npm run package`.
3. Smoke-test each zip, unzipped, against live Gmail:
   - Chrome: `chrome://extensions` → Load unpacked → the unzipped Chrome dir.
   - Firefox: `about:debugging` → Load Temporary Add-on → its `manifest.json`.
   - Popup shows a fresh code, click copies, Alt+Shift+C flashes ✓.
4. Merge to `main`, then tag and push: `git tag v1.4.0 && git push origin v1.4.0`.
   The `release` workflow re-runs the tests, builds the zips (failing if the
   tag doesn't match the manifest version) and attaches them to a GitHub
   Release.
5. Upload the zips from that release to the stores (below).

## Chrome Web Store

One-time setup: a developer account at
<https://chrome.google.com/webstore/devconsole> (one-time registration fee),
with a verified contact email.

First submission:

1. **New item** → upload `otp-peek-chrome-<ver>.zip`.
2. **Store listing**: description, category, language from
   `store/listing.md`; icon `icons/icon-128.png`; screenshot
   `store/screenshot-1280x800.png`; small promo tile
   `store/promo-tile-440x280.png`.
3. **Privacy practices**: single purpose, the three permission
   justifications, "no remote code", the data-usage checkboxes and the
   privacy-policy URL, all from `store/listing.md`.
4. **Distribution**: Public (or Unlisted to share by link first).
5. **Submit for review.** Expect an in-depth review because of the
   `mail.google.com` host permission; usually a few days.

Updates: **Package** → **Upload new package** → submit. The listing and
privacy answers carry over.

Edge Add-ons (<https://partner.microsoft.com/dashboard/microsoftedge>) takes
the same Chrome zip and the same listing text.

## addons.mozilla.org

One-time setup: a Firefox account, then the developer hub at
<https://addons.mozilla.org/developers/>.

First submission:

1. **Submit a New Add-on** → **On this site** (listed) → upload
   `otp-peek-firefox-<ver>.zip`. The validator runs automatically; it should
   pass with no errors.
2. "Do you need to submit source code?" → **No** (nothing is minified,
   bundled, or generated).
3. Listing: name, summary, description, categories, support/homepage links,
   privacy policy (paste `PRIVACY.md` text), screenshot, from
   `store/listing.md`.
4. Paste the **Notes to reviewer** from `store/listing.md`.

The add-on id `otp-peek@govindarajue6data.github.io` in
`browser_specific_settings.gecko.id` ties every future upload to this
listing. Never change it.

Updates: the add-on's page → **Upload New Version** → the new Firefox zip.

To self-distribute a signed `.xpi` instead (no listing), choose **On your own**
in step 1. AMO signs it after automated review, and the `.xpi` installs
permanently in release Firefox.

## Regenerating icons and store images

Sources: `icons/icon.svg`, `store/screenshot.html`, `store/promo-tile.html`
(the screenshot reuses `popup.css`, so it tracks popup styling). After
editing any of them:

```sh
npm run assets                    # uses Chrome/Chromium found on PATH
CHROME=/path/to/chrome npm run assets
```

This drives headless Chrome over the DevTools protocol (Node 22 built-ins
only) and overwrites the committed PNGs. Commit the results.
