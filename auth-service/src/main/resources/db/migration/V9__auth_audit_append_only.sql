-- The audit trail is append-only for the application: the runtime role (auth_app, see docker/db/10-app-role.sh)
-- may read and insert audit rows but can no longer change or delete them, so a leaked application
-- password or an SQL-injection cannot rewrite history. The owner role that runs Flyway is not affected.
-- Skipped where that role does not exist (a plain database without the runtime role, e.g. in tests).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_app') THEN
        EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON auth_audit FROM auth_app';
    END IF;
END
$$;
