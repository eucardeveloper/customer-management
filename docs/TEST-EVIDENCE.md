# Test evidence

What was run, where, and what came out. "Run by the author" means a command run on the author's machine against the commit named below; CI results are on the repository's Actions page.

| Check | Result | How |
|---|---|---|
| auth-service | 84 passed | `./mvnw test` |
| order-service | 58 passed | `./mvnw test` |
| customer-service | 38 passed | `./mvnw test` |
| api-gateway | 19 passed | `./mvnw test` |
| Frontend unit tests | customer-app 35 passed (API client, auth helpers, percentages, trend badges, order statistics, translations); ai-agent-app 5 passed (chat guard); lint, tsc and production build clean | `npm test` in each app |
| End-to-end (Playwright) | 6 scenarios in `e2e/tests/journey.spec.ts`; green in GitHub Actions on `main`; the suite removes the user it creates | `cd e2e && npx playwright test` against `docker compose up` |
| Live, on docker compose | a forged identity header sent straight to the order service answers 401 (gateway shared secret); login/logout; unauthenticated 401; wrong password 401; 30 failures from one address then 429; password change ends the old session; deleting a customer with orders 409; order for an unknown customer 400; order events reach Kafka via the outbox (`ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_DELETED`, all `published`) | commands in the commit history / `docs/DEPLOY-RAILWAY.md` smoke test |
| Manual scenarios | 36 browser/API scenarios listed in [MANUAL-TEST-MATRIX.md](MANUAL-TEST-MATRIX.md); status per row, none marked passed before it is run | by hand against `docker compose up` |
| Not yet verified | the hosted (Railway) deployment and its same-origin mode; consumer idempotency against a live broker (covered by Testcontainers tests only) | see `docs/DEPLOY-RAILWAY.md` |

Counts of the backend and frontend rows are the totals of the Surefire reports and `node --test` summaries from the author's last local runs (2026-10-16 / 2026-10-17); the end-to-end row is the scenario count in the spec file, run in the `E2E` workflow. The numbers above are updated when the suites are run again; they are not a promise about later commits.
