# Contributing

Thanks for helping! This project stays deliberately small. Two house rules:

1. **Zero dependencies, no build step.** Plain JS, stdlib only. If a change
   needs a package or a bundler, open an issue first.
2. **Test-first on logic.** All parsing/extraction/ranking lives in
   `extractor.js` as pure functions. Write the failing test in
   `test/extractor.test.js` before the fix. Browser glue (`popup.js`,
   `feed.js`, `background.js`) is verified by hand — keep logic out of it.

## Dev loop

```sh
git clone https://github.com/govindarajue6data/otp-peek.git
npm test          # run the suite
npm run coverage  # suite + enforced 100% line/branch/function coverage on extractor.js
```

CI runs `npm run coverage` on every PR — if your change drops any coverage
number on `extractor.js` below 100%, the build fails. Browser glue files are
outside the gate on purpose (they need a real browser).

Load the directory as an unpacked extension (README has the steps per
browser). After a change: reload the extension, trigger a real email OTP,
click the icon and press the hotkey.

## Pull requests

- Branch from `main`; keep PRs small and single-purpose.
- Fill in the PR checklist — it is short on purpose.
- A wrong-code or missed-code report is gold: add the (redacted) subject +
  snippet as a test case in `test/extractor.test.js`.

## Design notes

`docs/spec.md` records what was decided and why, including the fallback plan
if Google retires the feed endpoint.
