-- Optimistic locking: every save of an order bumps this number, and a save that started from an older
-- copy is refused (HTTP 409) instead of silently overwriting the newer one.
-- Existing rows start at 0. Additive only; nothing is rewritten or dropped.
ALTER TABLE orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
