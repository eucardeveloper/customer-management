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
- The auth-service is on the path of every request that is not answered from the cache (at most one call per token per 10 s per gateway instance); if it is down, requests whose cache entry has expired answer 503, and so does every new sign-in.
- A token stolen while the user stays signed in is valid until it expires (30 min) or the version changes.

## Limits of this design, and what would replace it
This is sized for one gateway and one auth-service instance. Said plainly, so it is not found by a reviewer first:
- **The auth-service is a dependency of the gateway.** There is no second copy and no fallback; the gateway
  fails closed. A real deployment would run several auth-service instances behind the same address.
- **The cache lives in each gateway process.** With several gateway instances each keeps its own 10 s window, so
  the worst-case delay for a revocation stays 10 s, but the number of calls to the auth-service grows with the
  instance count. Concurrent first requests with the same token are not coalesced into one call.
- **The cache is dropped completely when it reaches 10,000 entries** (simple and bounded, not an LRU). Under that
  many distinct active sessions the check would fall back to one call per request for a moment.
- **What scales better:** services verify the JWT signature locally and only a small list of revoked sessions
  (`jti` and `token_version` bumps) is pushed to or polled by the gateways, e.g. over Kafka. That removes the
  per-session call but adds a second mechanism to keep correct. It was not built because nothing here needs it
  and the measured cost of the current design is one cached lookup per token per 10 s.
- **A measurement that would justify the change:** the auth-service session endpoint's latency or error rate
  showing up as the gateway's bottleneck in the existing Prometheus metrics.
