# Security Policy

This extension reads Gmail's unread-inbox feed (subjects, snippet previews,
senders) and writes codes to the clipboard. Anything that could leak mail
content, widen its access, or let another page/extension read the codes is a
security issue.

## Reporting

Please **do not open a public issue** for security problems. Use GitHub's
private reporting instead: **Security tab → Report a vulnerability** on this
repository. You will get a response within a few days.

## Scope notes

- The only permitted host is `mail.google.com`; a change that makes any
  other network request should fail review — flag it if you spot one.
- No mail content or codes are ever persisted; storage use of any kind is
  out of contract.
