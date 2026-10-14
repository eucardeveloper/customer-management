# Design decisions — Customer Management platform

Why it is built as four services: this project is a deliberate learning and portfolio exercise in distributed-system problems (identity across services, session revocation, a reliable event after a database write, consistency across two databases). For a real product of this size a modular monolith would be the simpler and cheaper choice; the costs of the split are listed under "Known limitations".

| Concern | Decision | Why / trade-off |
|---|---|---|
| Single entry point | Only the gateway (8080) and the two frontends are published; services, databases and Kafka have no host ports | Smaller attack surface; every request must pass JWT validation. |
| Identity propagation | The gateway validates the session with the auth-service and forwards `X-Auth-User` / `X-Auth-Role` plus a shared secret (`X-Gateway-Secret`). The customer and order services only trust those headers when the secret matches (constant-time compare) | The network boundary is no longer the only protection: another container cannot make up an identity. Trade-off: one shared secret to manage; services do not verify the JWT themselves. |
| Authorization in services | `GET` needs authentication; `POST/PUT/PATCH/DELETE` on orders and customers need ADMIN; non-admins get `price = null` | Enforced server-side, not just hidden in the UI. Covered by `OrderApiAuthorizationTest` and `CustomerApiAuthorizationTest`. |
| Anonymous requests | `HttpStatusEntryPoint(401)` | Distinguishes "not logged in" from "forbidden" (403 only for a signed-in user without the role). |
| Browser session | HttpOnly, `SameSite=Strict` cookie, 2 h lifetime; the gateway checks `Origin` on cookie-authenticated writes and CORS uses an allowlist | The token is unreadable from scripts. Trade-off: no refresh token, so the user signs in again after 2 h. |
| Session revocation | `token_version` per user (password or role change ends all sessions), `jti` revoke list on logout; the gateway asks the auth-service and caches a positive answer for 10 s; if the auth-service cannot answer the gateway refuses (401/503) | A revoked session lives at most ~10 s. Trade-off: the auth-service is a dependency of every request. |
| Brute force | Failed sign-ins are stored in the database: 5 per username and 30 per client address in 15 minutes, then `429` with `Retry-After`; address = right-most public `X-Forwarded-For` entry | Survives restarts and is shared by all instances. Trade-off: a stranger can briefly lock a known username; people behind one NAT share an address budget. |
| Sign-up | Self-registration is off unless `AUTH_REGISTRATION_ENABLED=true` (docker compose turns it on for the local demo); a hosted deployment can replace the admin password and drop the demo user at first start (`AUTH_BOOTSTRAP_*`) | Any signed-in user can read customers and orders, so open sign-up on a public URL would expose that data. |
| Event after a write | Transactional outbox: order and event row are saved in one transaction (`ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_DELETED`); a relay publishes with `FOR UPDATE SKIP LOCKED`, keyed by order id, and marks rows published only after the broker acknowledged; old rows are deleted after 14 days | Closes the "saved but not sent" gap. Delivery is at-least-once. Several relay instances could publish two events of one order in a different order; with the current single relay they cannot. |
| Kafka consumption | Durable idempotency table: events carry a business `eventId`; plain messages fall back to `group:topic:partition:offset`; written in the same transaction as the handling; dead-letter topic for failures | A redelivered message is skipped; a concurrent duplicate loses on the primary key and is retried. Scope is "idempotent consumer", not exactly-once end to end. The consumers currently only log: the plumbing is real, there is no business projection yet. |
| Cross-service integrity | Deleting a customer asks the order-service (409 if orders exist); creating an order asks the customer-service (400 if unknown); an unreachable peer answers 503 | No distributed transaction, so an order created in the instant between the check and the delete can still slip through. Closing that fully needs a saga or a shared database. |
| Schema | Flyway owns every schema; Hibernate runs with `ddl-auto=validate` in all three services | Schema changes only come from reviewed, versioned SQL. |
| Input validation | Order status and customer type are restricted to known values; amounts and quantities are validated | Bad values cannot reach the dashboards. |
| Timeouts | Gateway connect timeout 3 s, response timeout 15 s; service-to-service calls 2 s / 3 s | A slow service cannot hang a request indefinitely. |
| Secrets | `JWT_SECRET` and `GATEWAY_SHARED_SECRET` are required (`${...:?...}`); `.env.example` provided; no secret is committed | Compose refuses to start without them. |
| Persistence | Named volumes for all databases, Kafka, Zookeeper, Prometheus; `restart: unless-stopped` | Data survives a reboot. |

## Known limitations
- Stolen session cookie: valid until it expires (2 h) or the account's `token_version` changes; no refresh-token rotation.
- Race window between "customer has no orders" and the delete (see above).
- The consumers only log; there is no business effect behind the events yet.
- Frontend unit tests are few; the end-to-end suite is run manually (`e2e` workflow) rather than on every push.
- Demo accounts are seeded by a Flyway migration; hosted deployments must use the bootstrap variables or change them at once.
- The AI chat sends customer names and order data to a third-party model provider (OpenRouter); e-mail and phone are not sent. With real personal data a data-processing agreement would be required.
