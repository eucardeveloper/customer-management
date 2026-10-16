-- Two services, two databases, no shared transaction: deleting a customer has to ask the order-service
-- whether orders exist. To keep an order from being created in the gap between that answer and the delete,
-- a delete first claims the customer with this timestamp; while the claim is fresh the customer reads as
-- "not found" to the order-service. A claim older than the hold time is ignored, so a crash mid-delete
-- never hides a customer for good.
ALTER TABLE customer ADD COLUMN deletion_pending_since TIMESTAMP;
