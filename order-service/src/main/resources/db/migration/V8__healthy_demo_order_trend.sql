-- =============================================================================
-- V8 — Give the demo orders a believable last-30-days trend (demo data only)
-- =============================================================================
-- After V7 the dashboard compared 5 orders in the last 30 days (only one delivered) with 3 delivered
-- orders before that, so it showed -30.6 % revenue and -80 pp fulfilment on a brand-new database.
-- That is what the dates and statuses happened to be, not something the application got wrong, but it
-- is a poor first impression. This re-dates and re-statuses the same eight orders (matched by
-- customer, product, price and quantity, exactly as V4 inserted them):
--   * previous 30 days:  1 delivered order, 1 cancelled order
--   * last 30 days:      4 delivered, 1 processing, 1 pending
-- so revenue is up and the delivered share is up, with every status but shipped on screen.
--
-- Safety: nothing is inserted or deleted, and a row is touched only while its date is within the
-- last 70 days (the span V7 spread them over), so a database whose demo rows were removed or
-- moved far back by somebody is left alone.
UPDATE orders o
SET date   = NOW() - v.age,
    status = v.status
FROM (VALUES
    (5, 'Server Rack Unit',       2499.99, 1, INTERVAL '38 days',  'DELIVERED'),
    (1, 'Wireless Mouse',           29.99, 2, INTERVAL '45 days',  'CANCELLED'),
    (1, 'Laptop Pro 15',          1299.99, 1, INTERVAL '21 days',  'DELIVERED'),
    (2, 'Mechanical Keyboard',     149.99, 1, INTERVAL '17 days',  'DELIVERED'),
    (3, 'Monitor 27" 4K',          599.99, 2, INTERVAL '9 days',   'DELIVERED'),
    (2, 'Webcam HD 1080p',          79.99, 1, INTERVAL '6 days',   'DELIVERED'),
    (3, 'Office Chair Ergonomic',  399.99, 3, INTERVAL '4 days',   'PROCESSING'),
    (4, 'USB-C Hub',                49.99, 1, INTERVAL '1 hour',   'PENDING')
) AS v(customer_id, product_name, price, quantity, age, status)
WHERE o.customer_id  = v.customer_id
  AND o.product_name = v.product_name
  AND o.price        = v.price
  AND o.quantity     = v.quantity
  AND o.date         > NOW() - INTERVAL '70 days';
