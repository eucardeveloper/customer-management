-- =============================================================================
-- V2 — Demo seed data
-- Passwords are BCrypt hashes:
--   admin   → admin123
--   user1   → user123
-- =============================================================================
INSERT INTO users (username, password, email, role) VALUES
    ('admin', '$2a$10$FTVD1sipDNLiVYqeT/d8OeMAPrsqe5yng9Fkp.FQE8a1RcK0fTD3O', 'admin@customer.com', 'ADMIN'),
    ('user1', '$2a$10$AV2hIimXePzVh.4z5/U3BeKceowwyggf5wDeTAr.Vn8omUtmU4yui', 'user1@customer.com', 'USER')
ON CONFLICT (username) DO NOTHING;
