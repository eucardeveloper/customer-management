# Architecture decision records

Short records of the decisions a reviewer is most likely to question: what the problem was, what was chosen,
what was rejected and why, what it costs, and which test keeps it true. [DESIGN-DECISIONS.md](../DESIGN-DECISIONS.md)
is the one-table overview; these are the reasoning behind its security and consistency rows.

| # | Decision | Kept true by |
|---|---|---|
| [0001](0001-identity-propagation-gateway-secret.md) | The gateway confirms the session; services trust its identity headers only with a shared secret and refuse to start without one | `GatewayHeaderAuthFilterTest`, `CustomerApiAuthorizationTest`, `OrderApiAuthorizationTest` |
| [0002](0002-server-side-session-revocation.md) | Sessions are revoked on the server (`token_version`, `jti` list), confirmed by the gateway with a 10 s cache, fail closed | `JwtAuthenticationFilterTest`, `AuthServiceSessionValidatorTest`, E2E "changing a password ends every older session" |
| [0003](0003-cross-service-delete-integrity.md) | Customer delete vs. new order across two databases: claim, check, re-check and undo instead of a distributed transaction | `CustomerServiceTest`, `CustomerRepositoryClaimTest`, `OrderServiceTest`, E2E "deleting a customer" |
| [0004](0004-transactional-outbox.md) | Order events through a transactional outbox, at-least-once, idempotent consumer, backlog measured | `OutboxIntegrationTest`, `OrderConsumerIdempotencyTest`, `OutboxMetricsTest`, alert rule tests |
| [0005](0005-last-admin-invariant-under-concurrency.md) | "There is always an administrator" holds under concurrent changes (row lock on the admin rows) | `LastAdminConcurrencyTest` (PostgreSQL, parallel), E2E "the last administrator" |
