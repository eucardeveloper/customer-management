# 0007 Why the customer and order lists are loaded whole and filtered in the browser

Status: accepted

## Context
`GET /api/customers` and `GET /api/orders` return every row. The browser then searches, filters, sorts and
pages them. Six screens depend on the full data sets, not only the two tables: the dashboard totals and trends,
the analytics charts, the Excel export, the AI assistant's context, the order table's customer names and the
order search by customer name.

## Decision
Keep the lists whole for now. The system is sized for a few hundred to about a thousand customers and orders,
where one list call is a few hundred kilobytes and every filter, sort and search answers instantly without a
round trip. The audit feeds, which grow with every action and are only ever read a page at a time, are paged
on the server (100 rows at most) and filtered there.

## Alternatives rejected
- **Page only the two tables on the server.** The dashboard, analytics and export would still need every row,
  so the full list would be fetched anyway and the paging would only add round trips.
- **Silently cap the list at N rows.** Totals and charts would be wrong without any sign of it.

## What moving to server-side paging would take
1. Server-side filter, sort and search parameters on both list endpoints (the audit controllers already show the
   pattern: `JpaSpecificationExecutor`, whitelisted sort, `Page` DTO).
2. A statistics endpoint for the dashboard and analytics (counts per status, revenue, trend buckets) so they stop
   reading every order, and a streamed or paged export.
3. The customer name resolved on the server (joined or embedded) instead of looked up in the browser.
4. Moving `listSort.ts` / `listFilters.ts` / the order search to query parameters; the same tests then run
   against the API.

The trigger to do it is the list call or the export becoming slow, not a record count.

## Consequences
- Simple, instant screens at the intended size; one request per list.
- Past roughly a thousand rows the list calls and the export slow down and need the work above; this is stated in
  the README's known limitations.
