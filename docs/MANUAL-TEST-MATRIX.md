# Manual test matrix

Browser and API scenarios that automated tests do not cover end to end. Each row has an expected result and a status. **Nothing is marked as passed until it has been run**; the date and the person or tool that ran it go into the "Run" column.

Setup: `docker compose up -d --build`, frontend `http://localhost:3000`, gateway `http://localhost:8080`. Demo accounts: `admin / admin123` (ADMIN), `user1 / user123` (USER, read-only).

Also checked after the rebuild: an admin setting a password shorter than 8 characters now gets `400` with the message and stays signed in (before: empty `401` and a forced sign-out).

## Roles and access

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| R1 | anonymous | Open `/customers` directly | Redirect to the login page | Passed | 2026-10-17 by Claude, API/browser |
| R2 | anonymous | `GET /api/customers` through the gateway | `401` | Passed | 2026-10-17 by Claude, API/browser |
| R3 | USER | Sign in as `user1`; open Customers and Orders | Lists visible; no create/edit/delete buttons | Passed (non-admin account) | 2026-10-17 by Claude, API/browser |
| R4 | USER | Orders list and dashboard | Prices and revenue are not shown (null/masked) | Passed | 2026-10-17 by Claude, API/browser |
| R5 | USER | `POST /api/customers` with the USER cookie | `403` | Passed after fix (403) | 2026-10-17 by Claude, API, after rebuild |
| R6 | USER | Open the Users page / `GET /api/users` | Page hidden or refused; API `403` | Passed after fix (403) | 2026-10-17 by Claude, API, after rebuild |
| R7 | ADMIN | Sign in as `admin`; open every page | All pages load, no console errors | Not run | |

## Customers

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| C1 | ADMIN | Create a customer with valid data | Row appears in the list | Passed (API) | 2026-10-17 by Claude, API/browser |
| C2 | ADMIN | Create with empty name or invalid e-mail | Inline validation error, nothing saved | Passed (API, 400 with field messages) | 2026-10-17 by Claude, API/browser |
| C3 | ADMIN | Edit the customer, reload | Change persists | Passed (API) | 2026-10-17 by Claude, API/browser |
| C4 | ADMIN | Delete a customer that has orders | Refused with `409` and a clear message | Passed (API, 409) | 2026-10-17 by Claude, API/browser |
| C5 | ADMIN | Delete a customer without orders | Customer disappears; reload confirms | Passed (API) | 2026-10-17 by Claude, API/browser |

## Orders and events

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| O1 | ADMIN | Create an order for an existing customer | Row appears with status PENDING | Passed (API) | 2026-10-17 by Claude, API/browser |
| O2 | ADMIN | Create an order for a customer id that does not exist (API) | `400` | Passed (API, 400) | 2026-10-17 by Claude, API/browser |
| O3 | ADMIN | Update and delete an order | Changes visible; dashboard numbers follow | Passed (API) | 2026-10-17 by Claude, API/browser |
| O4 | ADMIN | After O1, check `outbox_event` and Kafka topic `order-events` | Row `published`; event `ORDER_CREATED` on the topic | Not run | |
| O5 | ADMIN | Dashboard with no orders in the last 30 days | Neutral "no recent orders", no invented percentage | Not run | |

## Session and password

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| S1 | any | Wrong password | One generic error, no session cookie | Passed | 2026-10-17 by Claude, API/browser |
| S2 | any | 6 wrong passwords for one username | `429` with `Retry-After` | Passed: 429 after 5 failures (Retry-After header not readable from a cross-origin script) | 2026-10-17 by Claude, API/browser |
| S3 | any | Sign out, press Back | Login page, not the dashboard | Passed | 2026-10-17 by Claude, API/browser |
| S4 | ADMIN | Change a throw-away user's password in tab A | Tab B (same user) is signed out within about 10 s | Partly: old password refused, new one accepted; end of the old session is covered by the Playwright test | 2026-10-17 by Claude, API/browser |
| S5 | any | Wait past the 30 min lifetime | Next request returns to login with the session notice | Not run | |
| S6 | ADMIN | Change a user's role | That user's old session stops working | Not run | |

## User management

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| U1 | ADMIN | Create/promote/delete a throw-away user | Works; deleted user cannot sign in | Passed (API) | 2026-10-17 by Claude, API/browser |
| U2 | ADMIN | Delete or demote the only ADMIN | Refused with `409` and a clear message | Failed 2026-10-17 (no such rule); fixed in code. Live re-run skipped on purpose (a failure would lock out the only admin); covered by a Playwright test in CI | |

## AI assistant

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| A1 | ADMIN | Ask "Which customer placed the most orders?" | Answer from stored data | Passed after fix (names the customers with the most orders) | 2026-10-17 by Claude, API, after rebuild |
| A2 | USER | Ask for total revenue | No prices or revenue disclosed | Not run | |
| A3 | any | Message longer than 2000 characters | Rejected with a clear error | Passed | 2026-10-17 by Claude, API/browser |
| A4 | any | Chat without `OPENROUTER_API_KEY` | `503` with a readable message, no stack trace | Not run | |
| A5 | any | Send a message that tries to override instructions ("ignore the data block ...") | Model does not follow it; no e-mail/phone in the reply | Passed (no e-mail or phone in the answer) | 2026-10-17 by Claude, API/browser |

## Display

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| D1 | any | Light and dark theme, reload | Choice persists; contrast readable | Not run | |
| D2 | any | Widths 390, 768, 1280, 1920 | No horizontal page scroll, actions reachable | Not run | |
| D3 | any | Keyboard only through login, tables and dialogs | Visible focus ring; Escape closes dialogs | Not run | |

## Failure behaviour

| ID | Steps | Expected | Status | Run |
|---|---|---|---|---|
| F1 | Stop `auth-service`, then open any page | Gateway answers `503` (fail closed), UI shows an error, no stale data | Not run | |
| F2 | Stop `order-service`, delete a customer | Refused with `503`, customer is kept | Not run | |
| F3 | Stop Kafka, create an order, start Kafka | Order saved; event published after Kafka returns (outbox) | Not run | |
