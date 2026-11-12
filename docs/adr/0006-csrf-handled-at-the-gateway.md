# 0006 Why Spring's CSRF protection is switched off in the services

Status: accepted

## Context
CodeQL flags `csrf.disable()` in the auth, customer and order services ("Disabled Spring CSRF protection", high).
That setting is wrong for an application where the browser's cookie logs a user in to the service itself. This
system is built differently, so the finding needs an explicit answer instead of a quiet dismissal.

## Decision
CSRF is handled in front of the services, where the cookie lives, and the services never see a cookie:
- The browser session is an HttpOnly, `SameSite=Strict` cookie, so a request started from another site does not carry it.
- The gateway is the only place that reads the cookie. For a state-changing request (POST, PUT, PATCH, DELETE)
  that authenticates with the cookie it requires an `Origin` header from the allowed list and answers 403 otherwise.
- The gateway removes the `Cookie` header before forwarding. The services authenticate from the gateway's
  headers (identity plus a shared secret, ADR 0001) or a Bearer token, neither of which a browser attaches by itself,
  so there is no ambient credential for a forged request to ride on. They are not published to the host.
- Spring's own CSRF token would add nothing here and would break every non-browser client, so it stays off.

## Alternatives rejected
- **Turn Spring CSRF on in the services.** They have no session or cookie to protect; the token would have to be
  fetched and replayed by every client for no gain.
- **Dismiss the alert without a record.** A reviewer who sees "disabled CSRF" deserves the reasoning and the tests.

## Consequences
- Safety depends on three things staying true at once: the cookie stays `SameSite=Strict`, the gateway keeps the
  Origin check, and the services stay unreachable from outside the compose network. Each has a test below.
- `POST /api/auth/logout` is public and reads the cookie in the auth-service. A forged logout would only end a
  session (low impact), and `SameSite=Strict` already stops the browser from sending the cookie cross-site.
- The three CodeQL alerts are accepted as a documented design decision (dismissed in GitHub as "won't fix" with a
  link to this record).

## Kept true by
`JwtAuthFilterTest.cookieWriteNeedsOrigin` and `cookieWriteFromOwnOrigin` (a cookie-authenticated write without an
allowed Origin is refused, with one it passes), `JwtAuthFilterTest.cookieRead` (the `Cookie` header is not forwarded),
`AuthControllerTest` (the session cookie is HttpOnly and `SameSite=Strict`), `GatewayHeaderAuthFilterTest` (the
services refuse identity headers that come without the shared secret).
