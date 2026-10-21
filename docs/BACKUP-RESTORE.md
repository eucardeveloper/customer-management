# Backup and restore

| What | How | Where |
|---|---|---|
| Code | `git push` to GitHub | the repository |
| Databases (auth, customer, order) | `backup.bat` runs `pg_dump -Fc` in each `*-db` container | `backups\<timestamp>\*.dump` (git-ignored) |
| Secrets (`.env`) | not in git by design; keep a copy yourself | your password manager |

## Back up

```
.\backup.bat
```

## Restore test

1. `.\backup.bat` and note the timestamp.
2. In the app, create a throw-away customer ("RESTORE TEST").
3. `.\restore.bat <timestamp>`, type `YES`.
4. Open `http://localhost:3000`: the throw-away customer must be gone, everything else as at backup time.

Status: first successful restore test on 2026-10-21 (`.\restore-test.ps1`: all three databases backed up, a marker written into a customer, backup restored, marker gone, customer count unchanged).

## Limits

- The three databases are dumped one after another, not at one instant; take the backup when nobody is working.
- Kafka and monitoring data are not backed up. Events not yet published are in the order database's outbox table and are restored with it.
- Keep a copy of `backups\` outside this computer.
