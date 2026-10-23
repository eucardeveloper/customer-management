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

## Limits

- The three databases are dumped one after another, not at one instant; take the backup when nobody is working.
- Kafka and monitoring data are not backed up. Events not yet published are in the order database's outbox table and are restored with it.
- Keep a copy of `backups\` outside this computer.
