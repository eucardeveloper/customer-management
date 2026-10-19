# Customer Management: manual acceptance (UAT) guide

Who runs it: the person giving the final acceptance. Every step is done by eye in the browser; mark each row PASS or FAIL.
Nothing in this file is marked as run. The result columns are empty on purpose; fill them in during your run and note the date.

Environment: `docker compose up -d --build` (the first start takes a few minutes), then `http://localhost:3000`. Demo accounts: `admin / admin123` (ADMIN), `user1 / user123` (USER).
Rule: if an expected result does not happen, write FAIL, add a screenshot with time and user, and stop that section.

## Preparation data

Customer: Ada Lovelace, ada@example.com, phone 555 0100. Order: product "Keyboard", quantity 2, unit price 49.90.

## 1) ADMIN (`admin`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 1.1 | Open the address without signing in, also `/customers` | Login page | |
| 1.2 | Sign in with a wrong password | Clear error, no session | |
| 1.3 | Sign in as `admin` | Menu shows Dashboard, Customers, Orders, Analytics, Users | |
| 1.4 | Customers, add the preparation customer | Row appears at once | |
| 1.5 | Add a customer with empty name or invalid e-mail | Field error, nothing saved | |
| 1.6 | Edit the customer, reload the page | Change persists | |
| 1.7 | Orders, add the preparation order for Ada | Row appears; total = 2 x 49.90 = 99.80 | |
| 1.8 | Change the order status in the table | Status updates and stays after reload | |
| 1.9 | Delete Ada while the order exists | Refused with a clear message (409) | |
| 1.10 | Delete the order, then delete Ada | Both disappear; reload confirms | |
| 1.11 | Dashboard and Analytics | Revenue figures and charts are visible | |
| 1.12 | Users, add a user, change its role, reset its password | Each works; the last admin cannot be demoted or deleted | |
| 1.13 | Tables | Text columns left, price and total right, status and quantity badges centred, actions right; headers aligned with cells | |

## 2) USER (`user1`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.1 | Sign in | No Users entry in the menu | |
| 2.2 | Customers and Orders | Lists visible; no add, edit, delete buttons | |
| 2.3 | Orders, Dashboard, Analytics | No unit price, total or revenue anywhere | |
| 2.4 | Type the Users address by hand | Not shown, or refused | |
| 2.5 | AI assistant (if configured) asks about revenue | No prices or revenue are given | |

## 3) Session

| # | Action | Expected | P/F |
|---|---|---|---|
| 3.1 | Sign in, close the browser, reopen | Signed out or still signed in: note which (the cookie lives 30 minutes, no refresh token) | |
| 3.2 | Stay signed in for 30 minutes without reloading, then click | Login page with a clear message | |
| 3.3 | Change your password in one window | The other window's session ends on its next request | |
| 3.4 | Sign out, press Back | Login page | |

## 4) Screen quality

| # | Action | Expected | P/F |
|---|---|---|---|
| 4.1 | Every page at 1440 px | No horizontal page scroll; actions column reachable | |
| 4.2 | Switch language and dark mode | Everything readable and translated | |
| 4.3 | Phone width | Menu becomes a drawer | |
| 4.4 | Empty list (search with no match) | Icon and short message | |

## Evidence

For every FAIL: screenshot, time, user. Keep the filled-in copy with the date as the acceptance record.
