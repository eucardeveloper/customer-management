# 0005 "There is always an administrator", also under concurrent changes

Status: accepted (2026-10-22, replaces a check-then-act version)

## Context
The last ADMIN may neither be demoted nor deleted, otherwise nobody can manage users. The first version
counted admins and then saved, in separate transactions. Two admins demoting (or deleting) each other at the
same moment both counted "2", both saved, and the system was left with **no** administrator.
`LastAdminConcurrencyTest` reproduced this on PostgreSQL in the first of 25 parallel rounds.

## Decision
`UserService.updateRole` and `deleteUser` run in one transaction that first locks every admin row
(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id FOR UPDATE`) and only then reads the target and decides.
The second of two concurrent calls waits for the first to commit; PostgreSQL then re-evaluates the `WHERE`,
so it sees one admin and is refused with 409. The rows are locked in id order, so two callers cannot deadlock.

## Alternatives rejected
- **`SERIALIZABLE` isolation.** Also correct, but the loser gets a serialization error that has to be retried
  and translated; the lock gives a deterministic 409 instead.
- **Optimistic locking (`@Version`) on the user row.** Does not help: the two requests change two different rows.
- **A database trigger or check.** A "count of admins >= 1" rule is not expressible as a row constraint and a
  trigger moves business logic out of sight of the tests.

## Consequences
- Role changes and user deletions are serialised among themselves. At admin-console traffic this is not measurable.
- The guarantee depends on the database honouring `FOR UPDATE` (PostgreSQL in all environments; H2 in unit tests only).
