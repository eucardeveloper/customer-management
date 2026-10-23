#!/bin/sh
# Gives n8n its own database and role inside the customer-db server, so n8n (which can run arbitrary
# workflow code) is no longer connected to customer_db with the postgres superuser and cannot read
# customer data or the application's tables.
#
# Runs when the data volume is first created, and is idempotent, so it can be run by hand against an
# existing volume:
#   docker compose exec -T customer-db sh /docker-entrypoint-initdb.d/20-n8n-db.sh
set -eu

N8N_USER="${N8N_DB_USER:-n8n_app}"
N8N_DB="${N8N_DB_NAME:-n8n_db}"
N8N_PASSWORD="${N8N_DB_PASSWORD:?N8N_DB_PASSWORD is not set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v n8n_user="$N8N_USER" -v n8n_db="$N8N_DB" -v n8n_password="$N8N_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
              :'n8n_user', :'n8n_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'n8n_user') \gexec
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
              :'n8n_user', :'n8n_password') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'n8n_db', :'n8n_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'n8n_db') \gexec
-- Only the owner (and superusers) may connect to the n8n database.
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'n8n_db') \gexec
SQL
echo "n8n database '$N8N_DB' (owner '$N8N_USER') is ready."
