# Test evidence

What was run, where, and what came out. "Run by the author" means a command run on the author's machine against the commit named below; CI results are on the repository's Actions page.

| Check | Result | How |
|---|---|---|
| auth-service | 101 passed (incl. `LastAdminConcurrencyTest` on PostgreSQL) | `./mvnw test` |
| order-service | 61 passed | `./mvnw test` |
| customer-service | 39 passed | `./mvnw test` |
| api-gateway | 21 passed | `./mvnw test` |
| Frontend unit tests | customer-app 41 passed (API client, auth helpers, percentages, trend badges, order statistics, translations, server messages); ai-agent-app 5 passed (chat guard); lint, tsc and production build clean | `npm test` in each app |
| End-to-end (Playwright) | 11 tests in `e2e/tests/`: 9 in `journey.spec.ts`, and in `integrity.spec.ts` the race between deleting a customer and adding an order (20 rounds through the gateway; no order may outlive its customer) and the role matrix (ADMIN, USER and anonymous callers on every endpoint, price masking); 11 passed, 0 skipped in the `E2E` workflow on 2026-10-22; the suite removes the data it creates | `cd e2e && npx playwright test` against `docker compose up` |
| Monitoring config | `promtool check config` valid; 3 alert rules, 3 rule unit tests pass; a deliberately broken threshold makes them fail | CI job "monitoring" |
| Backup and restore | `./restore-test.sh` PASS (all three databases; three changed rows gone; counts users=2, customers=5, orders=8 unchanged); with the restore step removed it reports FAIL | E2E workflow step, or by hand |
| Live, on docker compose | a forged identity header sent straight to the order service answers 401 (gateway shared secret); login/logout; unauthenticated 401; wrong password 401; 30 failures from one address then 429; password change ends the old session; deleting a customer with orders 409; order for an unknown customer 400; order events reach Kafka via the outbox (`ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_DELETED`, all `published`) | commands in the commit history / `docs/DEPLOY-RAILWAY.md` smoke test |
| Live, metrics (2026-10-22) | Prometheus with `monitoring/prometheus.yml`: all four targets `up` (gateway on its management port); every dashboard query returns data; Grafana provisions the datasource (health OK) and the dashboard; with Kafka stopped a new order showed `outbox_events_pending=1` and a growing age, back to 0 after Kafka returned | local stack, services started from the built jars |
| Manual scenarios | 36 browser/API scenarios listed in [MANUAL-TEST-MATRIX.md](MANUAL-TEST-MATRIX.md); status per row, none marked passed before it is run | by hand against `docker compose up` |
| Not verified here | the hosted (Railway) deployment and its same-origin mode (a hosted instance existed for a time and has been taken down; this repository ships no evidence for it, only the runbook); consumer idempotency against a live broker (covered by Testcontainers tests only) | see `docs/DEPLOY-RAILWAY.md` |

Counts of the backend and frontend rows are the Surefire and `node --test` totals of a run on 2026-10-22 on the commit that added them (0 failures, 0 skipped; Docker available, so the Testcontainers tests ran). Before that commit the `CI` workflow reported auth 90, order 58, customer 38, gateway 19 on `57bec16`, and the customer-app count was listed as 35 while the suite already had 41. The numbers above are updated when the suites are run again; they are not a promise about later commits.

## Defects found by the 2026-10-22 review

Each one was first reproduced by a test that failed, then fixed; the test stays as the guard.

| Defect | How it showed | Fix | Test that pins it |
|---|---|---|---|
| Adding a user from the admin page called public sign-up | The chosen role was ignored (ADMIN became USER), and the response set the new account's session cookie, so the admin's browser was now signed in as that USER. With sign-up off (hosted) adding users failed with 403 | `POST /api/users` (ADMIN only, role chosen, no cookie); the page uses it | E2E "an admin adds an ADMIN account ... stays signed in as themselves" (before the fix the browser session was `e2e_admin_747755` / `USER`); `UserControllerTest` |
| "Last administrator" check was check-then-act | Two admins demoting or deleting each other at once both succeeded; 0 admins left | Admin rows locked (`FOR UPDATE`) in one transaction before deciding | `LastAdminConcurrencyTest` (failed in round 0 with 0 admins; now 25 of 25 rounds pass, repeated 4 times) |
| Prometheus could not scrape the auth-service | `/actuator/prometheus` required a session, so every scrape got 401 and the target was down | `health` and `prometheus` open; other actuator endpoints still need a session | `MetricsEndpointSecurityTest` (failed with 401) |
| Services trusted identity headers when the gateway secret was missing | A deployment without `GATEWAY_SHARED_SECRET` would accept `X-Auth-Role: ADMIN` from anyone on the network | The service refuses to start | `GatewayHeaderAuthFilterTest.theServiceRefusesToStartWithoutASecret`; checked live: start-up stops with "GATEWAY_SHARED_SECRET is not set" |
| Two sign-ups racing for one username or e-mail | The loser hit the unique constraint and got 500 | `DataIntegrityViolationException` answers 409 | handler only; the race itself was not reproduced |
