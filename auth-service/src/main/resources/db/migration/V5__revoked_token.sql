-- Tokens ended on purpose (logout). Only the token id is stored; a row can be deleted once the token
-- would have expired anyway, because an expired token is rejected by its signature check.
CREATE TABLE revoked_token (
    jti        VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP   NOT NULL
);
CREATE INDEX idx_revoked_token_expires_at ON revoked_token (expires_at);
