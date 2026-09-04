-- =============================================================================
-- V2 — Demo seed data for orders
-- =============================================================================
INSERT INTO orders (customer_id, product_name, price, quantity, date, status) VALUES
    (1, 'Laptop Pro 15',        1299.99, 1, NOW() - INTERVAL '10 days', 'DELIVERED'),
    (1, 'Wireless Mouse',         29.99, 2, NOW() - INTERVAL '5 days',  'DELIVERED'),
    (2, 'Mechanical Keyboard',   149.99, 1, NOW() - INTERVAL '3 days',  'SHIPPED'),
    (3, 'Monitor 27" 4K',        599.99, 2, NOW() - INTERVAL '1 day',   'PROCESSING'),
    (4, 'USB-C Hub',              49.99, 1, NOW(),                       'PENDING'),
    (5, 'Server Rack Unit',     2499.99, 1, NOW() - INTERVAL '7 days',  'DELIVERED'),
    (2, 'Webcam HD 1080p',        79.99, 1, NOW() - INTERVAL '2 days',  'SHIPPED'),
    (3, 'Office Chair Ergonomic', 399.99, 3, NOW() - INTERVAL '4 days', 'PROCESSING');
