# Design decisions — Customer Management platform

| Concern | Decision | Why / trade-off |
|---|---|---|
| Single entry point | Only the gateway (8080) is published; services, databases and Kafka have no host ports | Smaller attack surface; every request must pass JWT validation. |
| Identity propagation | Gateway validates the JWT and forwards `X-Auth-User` / `X-Auth-Role`; services trust these headers because they are unreachable from outside | Services stay simple. Trade-off: the network boundary is part of the security model (documented in the README). |
| Authorization in services | `GET` needs authentication; `POST/PUT/PATCH/DELETE` on orders and customers need ADMIN; non-admins get `price = null` | Enforced server-side, not just hidden in the UI. Covered by `OrderApiAuthorizationTest` and `CustomerApiAuthorizationTest`. |
| Anonymous requests | `HttpStatusEntryPoint(401)` | Distinguishes "not logged in" from "forbidden". |
| Kafka delivery | At-least-once with a durable idempotency table: `group:topic:partition:offset` is the primary key of `processed_event`, written in the same transaction as the handling | A redelivered message is skipped; a concurrent duplicate loses on the primary key and is retried. Scope is honestly "idempotent consumer", not exactly-once end to end. Tested with Testcontainers. |
| Timeouts | Gateway connect timeout 3 s, response timeout 15 s | A slow service cannot hang the gateway indefinitely. |
| Secrets | `JWT_SECRET` is required (`${JWT_SECRET:?...}`); `.env.example` provided; no secret is committed | Compose refuses to start without it. |
| Persistence | Named volumes for all databases, Kafka, Zookeeper, Prometheus; `restart: unless-stopped` on all services | Data survives reboot. |

## Known limitations
- The JWT is kept in an `HttpOnly` `SameSite=Strict` cookie, not in `localStorage`; the gateway adds an Origin check for cookie-authenticated writes. Remaining limitation: no server-side revocation before expiry.
- `auth-service` still runs on Spring Boot 3.3.5.
- The gateway does not check that the user of a valid token still exists.
