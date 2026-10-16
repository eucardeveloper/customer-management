-- =============================================================================
-- V9 — Finish V8 for the monitor order (demo data only)
-- =============================================================================
-- V7 and V8 match the demo orders by product name. Some databases hold the monitor order as
-- 'Monitor 27 4K' (no inch mark) while V4 inserted 'Monitor 27" 4K', so both migrations skipped it
-- and the dashboard still compared one fewer delivered order than intended. This applies V8's values
-- to that row, ignoring the quote character in the name.
--
-- Safety: same as V8. Nothing is inserted or deleted, and a row is touched only while its date is
-- within the last 70 days. On a database where V8 already matched the row it sets the same values again.
UPDATE orders
SET date   = NOW() - INTERVAL '9 days',
    status = 'DELIVERED'
WHERE customer_id = 3
  AND replace(product_name, '"', '') = 'Monitor 27 4K'
  AND price    = 599.99
  AND quantity = 2
  AND date     > NOW() - INTERVAL '70 days';
