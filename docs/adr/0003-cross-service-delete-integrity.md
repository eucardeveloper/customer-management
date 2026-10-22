# 0003 Customer delete vs. new order across two databases

Status: accepted

## Context
Customers and orders live in separate databases, so there is no foreign key. Two rules must still hold:
an order must point at an existing customer, and a customer with orders must not be deleted. The race:
an order is created for customer 7 in the instant between "customer 7 has no orders" and "delete customer 7".

## Decision
1. Delete: claim the customer first (`deletion_pending_since = now`, one atomic `UPDATE ... WHERE` that only
   succeeds when no fresh claim exists). While claimed, the customer reads as "not found" to the order-service.
2. Then ask the order-service whether orders exist; 409 if so (claim released), otherwise delete.
3. Create or re-assign an order: check the customer before saving, and again after the commit. If the
   re-check finds the customer gone or claimed, the order is undone (deleted, or moved back), with its outbox event.
4. Either peer unreachable: refuse (503 / undo). A claim older than 30 s is ignored, so a crash never hides a customer for good.

Why it closes the race: the claim happens before the order lookup, and the re-check happens after the order's
commit. If the commit came first, the lookup sees the order and the delete is refused. If the lookup came
first, the claim already exists when the re-check runs, so the order is undone.

## Alternatives rejected
- **Two-phase commit / XA across the two databases.** Couples both services' availability and needs a
  transaction manager; heavy for one invariant.
- **Saga with compensation driven by events.** Would work, but turns a synchronous "can I delete this?" into
  an eventually consistent process the UI has to explain; the consumers do not yet carry business logic.
- **Soft delete only.** Avoids the race but leaves orders pointing at hidden customers, which is the same
  inconsistency moved elsewhere.
- **One database.** The honest best choice for a product this size (see README); kept separate on purpose to
  practise exactly this problem.

## Consequences
- A spurious refusal is possible (an order undone while a delete that is about to fail holds the claim); a
  wrong result is not. The client sees 400 and can retry.
- Both services must be up to delete a customer or create an order.
