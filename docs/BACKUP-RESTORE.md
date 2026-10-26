# Backup and restore

| What | How | Where |
|---|---|---|
| Code | `git push` to GitHub | the repository |
| Databases (auth, customer, order) | `backup.bat` runs `pg_dump -Fc` in each `*-db` container | `backups\<timestamp>\*.dump` (git-ignored) |
| n8n (`n8n_db` and the `n8n-data` files with its encryption key) | `backup.bat` dumps `n8n_db` and tars `/home/node/.n8n` | `backups\<timestamp>\n8n_db.dump`, `n8n-files.tgz` |
| Secrets (`.env`) | not in git by design; keep a copy yourself | your password manager |

## Back up

```
.\backup.bat
```

## Restore test

Automated, one command (Linux/macOS/CI; `.\restore-test.ps1` is the Windows version):

```
./restore-test.sh
```

It dumps all three databases, changes one row in each, restores the dumps with `pg_restore --exit-on-error`, and passes only if every change is gone and the row counts of `users`, `customer` and `orders` equal those at backup time. The E2E workflow runs it after the Playwright journey, so every run of that workflow is a restore test. A negative control (the same script with the restore step removed) reports `FAIL: changes left=3`.

By hand:

1. `.\backup.bat` and note the timestamp.
2. In the app, create a throw-away customer ("RESTORE TEST").
3. `.\restore.bat <timestamp>`, type `YES`.
4. Open `http://localhost:3000`: the throw-away customer must be gone, everything else as at backup time.

Status: first successful restore test on 2026-10-21 (`.\restore-test.ps1`: all three databases backed up, a marker written into a customer, backup restored, marker gone, customer count unchanged). `./restore-test.sh` passed on 2026-10-22 against a local stack (users=2, customers=5, orders=8 before and after); from then on the E2E workflow runs it.

Latest successful restore test on a local stack: **2026-10-26** (`.\restore-test.ps1`, backup `20261026_144104`: `auth_db`, `customer_db` and `order_db` restored with exit code 0, marker gone, customer count 5 = 5). The n8n database and its encryption key are backed up by `backup.bat` but are not part of the automated restore test; after a restore, open n8n and check that the workflows and credentials are there.

## After reformatting the computer (or on a new computer)

1. Install Docker Desktop and clone the repository.
2. Copy your backup folder (`backups\<timestamp>\`, including `n8n-files.tgz`) and your `.env` back into place.
3. `docker compose up -d --build`, then `.\restore.bat <timestamp>` and type `YES`.
4. Check the data in the app, and check n8n separately (see above).

## Limits

- The three databases are dumped one after another, not at one instant; take the backup when nobody is working.
- Kafka and monitoring data are not backed up. Events not yet published are in the order database's outbox table and are restored with it.
- This stack publishes ports 3000, 3001, 3002, 5678, 8080 and 9090. The Inventory stack (3001, 3002, 9090) and the LIMS stack (3000) use some of the same ports, so run only one of the three stacks at a time (stop one with `docker compose stop` before starting another).
- Keep a copy of `backups\` outside this computer.
