# Role matrix

The services are the authority. Rules are enforced server-side in each service's `SecurityConfig` (URL rules), in `UserController` (`@PreAuthorize`) and in `OrderController` (price masking). The gateway validates the JWT and forwards the verified user and role; the web app only hides or disables what a role cannot do. A hidden button is a convenience, not a security control.

Legend: yes = allowed, no = refused with `403` (or the page is not offered), masked = allowed, but prices and revenue are returned as `null`.

## Roles

| Role | Demo account | Summary |
|---|---|---|
| `ADMIN` | `admin` | Everything: customers, orders, prices and revenue, users |
| `USER` | `user1` | Read-only: sees customers and orders, no financial data, no changes |

## Matrix

| Capability | ADMIN | USER | Enforced by |
|---|---|---|---|
| Sign in / sign out | yes | yes | auth-service |
| Change own password (ends every older session of that account) | yes | yes | `/api/auth/password`, `tokenVersion` |
| List and open customers | yes | yes | `GET /api/customers/**` authenticated |
| Create, edit, delete customers | yes | no | `POST/PUT/PATCH/DELETE /api/customers/**` ADMIN |
| Delete a customer that still has orders | refused with `409` | no | customer-service |
| List and open orders | yes | yes | `GET /api/orders/**` authenticated |
| See unit price, order total, revenue | yes | masked | `OrderController` (price set to `null` for non-admins) |
| Create, edit, change status, delete orders | yes | no | `POST/PUT/PATCH/DELETE /api/orders/**` ADMIN |
| Users page: list, add (with a chosen role), change role, reset password, delete | yes | no | `/api/users/**` ADMIN (`POST /api/users` for adding; it issues no session, so the admin stays signed in) |
| AI assistant | yes (prices and revenue included in the context) | yes (no prices) | Next.js route, caller's JWT |

## Invariants that hold for every role

- The last `ADMIN` cannot be demoted or deleted (`409`), also when two admins act at the same moment (admin rows locked; `LastAdminConcurrencyTest`).
- The session cookie is `HttpOnly` and `SameSite=Strict`; requests whose `Origin` does not match are refused.
- Repeated failed sign-ins are throttled in the database (`LoginAttemptLimiter`).
- Services reject calls that do not carry the gateway's shared secret (`GatewayHeaderAuthFilter`) and do not start without one.

## How this was checked

- Automated: the Testcontainers and unit tests in each service; Playwright `e2e/integrity.spec.ts` calls every endpoint above as ADMIN, USER and anonymous and compares the status codes (and price masking) with this table, so a change to a rule fails CI until this document is updated; Playwright `e2e/journey.spec.ts` (login redirect, password change ends older sessions, USER refused with 403, last administrator, an admin adding an ADMIN account stays signed in as themselves).
- Manual: `docs/MANUAL-TEST-MATRIX.md` (rows R1 to R7 for roles) and `docs/UAT-GUIDE.md` in this repository.
