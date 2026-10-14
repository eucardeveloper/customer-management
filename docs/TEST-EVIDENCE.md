# Test evidence

What was run, where, and what came out. "Run by the author" means a command run on the author's machine against the commit named below; CI results are on the repository's Actions page.

| Check | Result | How |
|---|---|---|
| auth-service | 80 passed | `./mvnw test` |
| order-service | 50 passed | `./mvnw test` |
| customer-service | 27 passed | `./mvnw test` |
| api-gateway | 19 passed | `./mvnw test` |
| Frontend unit tests | customer-app 14 passed (API client, auth helpers, percentages, translations); ai-agent-app 5 passed (chat guard); lint, tsc and production build clean | `npm test` in each app |
| End-to-end (Playwright) | 5 / 5 passed on the rebuilt stack (2026-10-14); the suite removes the user it creates | `cd e2e && npx playwright test` against `docker compose up` |
| Live, on docker compose | a forged identity header sent straight to the order service answers 401 (gateway shared secret); login/logout; unauthenticated 401; wrong password 401; 30 failures from one address then 429; password change ends the old session; deleting a customer with orders 409; order for an unknown customer 400; order events reach Kafka via the outbox (`ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_DELETED`, all `published`) | commands in the commit history / `docs/DEPLOY-RAILWAY.md` smoke test |
| Not yet verified | the hosted (Railway) deployment and its same-origin mode; consumer idempotency against a live broker (covered by Testcontainers tests only) | see `docs/DEPLOY-RAILWAY.md` |

The numbers above are updated when the suites are run again; they are not a promise about later commits.
