-- =============================================================================
-- V7 — Spread the demo orders over about seven weeks (demo data only)
-- =============================================================================
-- V4 seeded the eight demo orders within the last ten days. The dashboard compares the last 30 days
-- with the 30 days before, so a freshly created database showed "no recent orders to compare" on
-- every KPI card and a one-point revenue trend. This moves the same eight orders (matched by
-- customer, product, price and quantity, exactly as V4 inserted them) so that both windows have data.
--
-- Safety: a row is touched only while its date is still inside V4's ten-day window, so orders that
-- somebody already moved or created later are left alone, and the statement does nothing on a
-- database that has none of these rows. Nothing is inserted or deleted.
UPDATE orders o
SET date = NOW() - v.age
FROM (VALUES
    (1, 'Laptop Pro 15',          1299.99, 1, INTERVAL '52 days'),
    (1, 'Wireless Mouse',           29.99, 2, INTERVAL '45 days'),
    (5, 'Server Rack Unit',       2499.99, 1, INTERVAL '38 days'),
    (2, 'Mechanical Keyboard',     149.99, 1, INTERVAL '17 days'),
    (3, 'Monitor 27" 4K',          599.99, 2, INTERVAL '9 days'),
    (2, 'Webcam HD 1080p',          79.99, 1, INTERVAL '6 days'),
    (3, 'Office Chair Ergonomic',  399.99, 3, INTERVAL '4 days'),
    (4, 'USB-C Hub',                49.99, 1, INTERVAL '1 hour')
) AS v(customer_id, product_name, price, quantity, age)
WHERE o.customer_id  = v.customer_id
  AND o.product_name = v.product_name
  AND o.price        = v.price
  AND o.quantity     = v.quantity
  AND o.date         > NOW() - INTERVAL '12 days';
