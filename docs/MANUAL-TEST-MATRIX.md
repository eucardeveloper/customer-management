# Manual test matrix

Browser and API scenarios that automated tests do not cover end to end. Each row has an expected result and a status. **Nothing is marked as passed until it has been run**; the date and the person or tool that ran it go into the "Run" column.

Setup: `docker compose up -d --build`, frontend `http://localhost:3000`, gateway `http://localhost:8080`. Demo accounts: `admin / admin123` (ADMIN), `user1 / user123` (USER, read-only).

## Roles and access

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| R1 | anonymous | Open `/customers` directly | Redirect to the login page | Not run | |
| R2 | anonymous | `GET /api/customers` through the gateway | `401` | Not run | |
| R3 | USER | Sign in as `user1`; open Customers and Orders | Lists visible; no create/edit/delete buttons | Not run | |
| R4 | USER | Orders list and dashboard | Prices and revenue are not shown (null/masked) | Not run | |
| R5 | USER | `POST /api/customers` with the USER cookie | `403` | Not run | |
| R6 | USER | Open the Users page / `GET /api/users` | Page hidden or refused; API `403` | Not run | |
| R7 | ADMIN | Sign in as `admin`; open every page | All pages load, no console errors | Not run | |

## Customers

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| C1 | ADMIN | Create a customer with valid data | Row appears in the list | Not run | |
| C2 | ADMIN | Create with empty name or invalid e-mail | Inline validation error, nothing saved | Not run | |
| C3 | ADMIN | Edit the customer, reload | Change persists | Not run | |
| C4 | ADMIN | Delete a customer that has orders | Refused with `409` and a clear message | Not run | |
| C5 | ADMIN | Delete a customer without orders | Customer disappears; reload confirms | Not run | |

## Orders and events

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| O1 | ADMIN | Create an order for an existing customer | Row appears with status PENDING | Not run | |
| O2 | ADMIN | Create an order for a customer id that does not exist (API) | `400` | Not run | |
| O3 | ADMIN | Update and delete an order | Changes visible; dashboard numbers follow | Not run | |
| O4 | ADMIN | After O1, check `outbox_event` and Kafka topic `order-events` | Row `published`; event `ORDER_CREATED` on the topic | Not run | |
| O5 | ADMIN | Dashboard with no orders in the last 30 days | Neutral "no recent orders", no invented percentage | Not run | |

## Session and password

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| S1 | any | Wrong password | One generic error, no session cookie | Not run | |
| S2 | any | 6 wrong passwords for one username | `429` with `Retry-After` | Not run | |
| S3 | any | Sign out, press Back | Login page, not the dashboard | Not run | |
| S4 | ADMIN | Change a throw-away user's password in tab A | Tab B (same user) is signed out within about 10 s | Not run | |
| S5 | any | Wait past the 30 min lifetime | Next request returns to login with the session notice | Not run | |
| S6 | ADMIN | Change a user's role | That user's old session stops working | Not run | |

## User management

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| U1 | ADMIN | Create/promote/delete a throw-away user | Works; deleted user cannot sign in | Not run | |
| U2 | ADMIN | Delete or demote the only ADMIN | Refused with `409` and a clear message | Failed 2026-10-17 (no such rule); fixed in code, to be re-run after rebuild | |

## AI assistant

| ID | Role | Steps | Expected | Status | Run |
|---|---|---|---|---|---|
| A1 | ADMIN | Ask "Which customer placed the most orders?" | Answer from stored data | Not run | |
| A2 | USER | Ask for total revenue | No prices or revenue disclosed | Not run | |
| A3 | any | Message longer than 2000 characters | Rejected with a clear error | Not run | |
| A4 | any | Chat without `OPENROUTER_API_KEY` | `503` with a readable message, no stack trace | Not run | |
| A5 | any | Send a message that tries to override instructions ("ignore the data block ...") | Model does not follow it; no e-mail/phone in the reply | Not run | |

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
