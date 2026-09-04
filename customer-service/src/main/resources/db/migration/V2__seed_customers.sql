-- =============================================================================
-- V2 — Demo seed data for customers
-- =============================================================================
INSERT INTO customer (first_name, last_name, email, phone, customer_type) VALUES
    ('Ahmet',   'Yılmaz',  'ahmet.yilmaz@example.com',  '+90-532-1234567', 'INDIVIDUAL'),
    ('Fatma',   'Kaya',    'fatma.kaya@example.com',    '+90-533-2345678', 'INDIVIDUAL'),
    ('Mehmet',  'Demir',   'mehmet.demir@example.com',  '+90-534-3456789', 'CORPORATE'),
    ('Ayşe',    'Çelik',   'ayse.celik@example.com',    '+90-535-4567890', 'INDIVIDUAL'),
    ('TechCo',  'Ltd.',    'info@techco.example.com',   '+90-212-5678901', 'CORPORATE')
ON CONFLICT DO NOTHING;
