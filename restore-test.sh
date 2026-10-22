#!/usr/bin/env bash
# Backup + restore test for Linux/macOS and CI (restore-test.ps1 is the Windows version):  ./restore-test.sh
# 1) dumps the three databases (pg_dump -Fc)  2) changes one row in each database
# 3) restores the dumps  4) checks every change is gone and every row count is what it was at backup time.
# Needs the auth-db, customer-db and order-db containers running (docker compose up -d).
# The backends are stopped during the restore and started again afterwards; set RESTORE_TEST_STOP="" to skip that.
set -euo pipefail
cd "$(dirname "$0")"

STOP="${RESTORE_TEST_STOP-auth-backend customer-backend order-backend api-gateway}"
TS="$(date +%Y%m%d_%H%M%S)"
DIR="backups/$TS"
MARKER="RESTORE-TEST-$TS"

sql() { docker exec "$1-db" psql -U postgres -d "$1_db" -v ON_ERROR_STOP=1 -t -A -c "$2"; }
counts() { echo "users=$(sql auth 'SELECT count(*) FROM users') customers=$(sql customer 'SELECT count(*) FROM customer') orders=$(sql order 'SELECT count(*) FROM orders')"; }
markers() {
  echo $(( $(sql auth "SELECT count(*) FROM users WHERE email LIKE '%$MARKER%'") \
         + $(sql customer "SELECT count(*) FROM customer WHERE last_name LIKE '%$MARKER%'") \
         + $(sql order "SELECT count(*) FROM orders WHERE product_name LIKE '%$MARKER%'") ))
}

echo "1/4 backup into $DIR"
mkdir -p "$DIR"
for p in auth customer order; do
  docker exec "$p-db" pg_dump -U postgres -Fc "${p}_db" > "$DIR/${p}_db.dump"
  size=$(wc -c < "$DIR/${p}_db.dump")
  [ "$size" -ge 1000 ] || { echo "FAIL: ${p}_db dump is only $size bytes"; exit 1; }
done
before="$(counts)"
echo "    at backup time: $before"

echo "2/4 changing one row in each database"
sql auth "UPDATE users SET email = email || '.$MARKER' WHERE id = (SELECT min(id) FROM users)" > /dev/null
sql customer "UPDATE customer SET last_name = coalesce(last_name, '') || ' $MARKER' WHERE id = (SELECT min(id) FROM customer)" > /dev/null
sql order "UPDATE orders SET product_name = coalesce(product_name, '') || ' $MARKER' WHERE id = (SELECT min(id) FROM orders)" > /dev/null
[ "$(markers)" = 3 ] || { echo "FAIL: the changes were not written"; exit 1; }

echo "3/4 restoring the backup"
# shellcheck disable=SC2086
[ -z "$STOP" ] || docker compose stop $STOP
for p in auth customer order; do
  docker cp "$DIR/${p}_db.dump" "$p-db:/tmp/restore.dump"
  # --exit-on-error: a partial restore must fail the test, not print a warning
  docker exec "$p-db" pg_restore -U postgres -d "${p}_db" --clean --if-exists --no-owner --exit-on-error /tmp/restore.dump
  docker exec "$p-db" rm -f /tmp/restore.dump
done
# shellcheck disable=SC2086
[ -z "$STOP" ] || docker compose start $STOP

echo "4/4 checking"
after="$(counts)"
left="$(markers)"
if [ "$left" = 0 ] && [ "$before" = "$after" ]; then
  echo "PASS: backup $TS restored; all three changes gone; row counts unchanged ($after)"
else
  echo "FAIL: changes left=$left; before: $before; after: $after"
  exit 1
fi
