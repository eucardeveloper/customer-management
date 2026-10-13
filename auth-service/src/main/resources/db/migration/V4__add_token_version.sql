-- Bumped on password change/reset and role change; JWTs carry the value they were issued with,
-- so a token issued before the bump stops working.
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
