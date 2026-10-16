-- =============================================================================
-- V10 — Make the demo trend consistent across the dashboard and the analytics page (demo data only)
-- =============================================================================
-- After V8/V9 revenue and the delivered share were up against the previous 30 days, but the average
-- order value was down 48 % (the previous window held the one very large order) and the monthly revenue
-- line fell from September to October. The numbers were right; they just told three different stories.
-- This moves the large server-rack order into the last 30 days and the laptop order into the previous
-- window, so revenue, order count, average order value and delivered share all point the same way:
--   previous 30 days:  laptop (delivered), wireless mouse (cancelled)
--   last 30 days:      server rack, keyboard, monitor, webcam (delivered), office chair (processing),
--                      USB hub (pending)
--
-- Matching: customer, price and quantity as V4 inserted them, with the quote character removed from the
-- product name (some databases hold 'Monitor 27 4K' where V4 inserted 'Monitor 27" 4K').
-- Safety: same as V8. Nothing is inserted or deleted, and a row is touched only while its date is within
-- the last 70 days.
UPDATE orders o
SET date   = NOW() - v.age,
    status = v.status
FROM (VALUES
    (1, 'Laptop Pro 15',          1299.99, 1, INTERVAL '45 days',  'DELIVERED'),
    (1, 'Wireless Mouse',           29.99, 2, INTERVAL '40 days',  'CANCELLED'),
    (5, 'Server Rack Unit',       2499.99, 1, INTERVAL '10 days',  'DELIVERED'),
    (2, 'Mechanical Keyboard',     149.99, 1, INTERVAL '17 days',  'DELIVERED'),
    (3, 'Monitor 27 4K',           599.99, 2, INTERVAL '9 days',   'DELIVERED'),
    (2, 'Webcam HD 1080p',          79.99, 1, INTERVAL '6 days',   'DELIVERED'),
    (3, 'Office Chair Ergonomic',  399.99, 3, INTERVAL '4 days',   'PROCESSING'),
    (4, 'USB-C Hub',                49.99, 1, INTERVAL '1 hour',   'PENDING')
) AS v(customer_id, product_name, price, quantity, age, status)
WHERE o.customer_id = v.customer_id
  AND replace(o.product_name, '"', '') = v.product_name
  AND o.price       = v.price
  AND o.quantity    = v.quantity
  AND o.date        > NOW() - INTERVAL '70 days';
