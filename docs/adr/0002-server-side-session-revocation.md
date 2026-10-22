# 0002 Server-side session revocation with a short gateway cache

Status: accepted

## Context
A plain JWT is valid until it expires. A password change, an admin password reset, a role change or a logout
must end existing sessions, otherwise "change your password" does not lock out someone who has the old token.

## Decision
- Each account has a `token_version`; tokens carry the version they were issued with. Password change, admin
  reset and role change increment it, which invalidates every older token of that account.
- Logout puts the token's `jti` on a `revoked_token` list until the token would have expired anyway.
- The auth-service checks both on every `/api/auth/session` call. The gateway calls it for every request and
  caches a positive answer for 10 s (keyed by a SHA-256 of the token, never the token itself).
- If the auth-service cannot answer, the gateway answers 503: it does not guess.
- The browser session is an HttpOnly, `SameSite=Strict` cookie; cookie-authenticated writes also need an allowed `Origin`.

## Alternatives rejected
- **Short-lived access token plus refresh token.** Shortens the window but a stolen refresh token extends a
  stolen session; rotation and reuse detection add a second state machine. The session simply ends after 30 min.
- **No cache, ask the auth-service on every request.** Correct but doubles the hops; 10 s was chosen as the
  longest a revoked session may keep working.
- **Fail open when the auth-service is down.** Rejected: an outage would turn revocation off.

## Consequences
- A revoked session keeps working for at most 10 s (the cache). Logout from the browser clears the cache entry at once.
- The auth-service is on the path of every request; if it is down, everything answers 503.
- A token stolen while the user stays signed in is valid until it expires (30 min) or the version changes.
