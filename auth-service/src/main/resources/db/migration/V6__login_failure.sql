-- Failed sign-ins (and failed password changes), kept in the database so the lockout survives a restart and
-- is shared by every auth-service instance. Rows older than the lockout window are deleted.
CREATE TABLE login_failure (
    id           BIGSERIAL PRIMARY KEY,
    throttle_key VARCHAR(255) NOT NULL,
    attempted_at TIMESTAMP    NOT NULL
);
CREATE INDEX idx_login_failure_key_time ON login_failure (throttle_key, attempted_at);
