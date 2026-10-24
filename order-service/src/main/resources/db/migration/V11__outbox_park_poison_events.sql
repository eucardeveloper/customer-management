-- A single event that can never be published (message too large, invalid topic) used to block every
-- event behind it. Permanent failures are now counted and, after a few attempts, the event is parked
-- (kept for inspection, no longer retried) so the rest of the queue keeps flowing.
ALTER TABLE outbox_event ADD COLUMN attempts   INT NOT NULL DEFAULT 0;
ALTER TABLE outbox_event ADD COLUMN parked_at  TIMESTAMP;
ALTER TABLE outbox_event ADD COLUMN last_error VARCHAR(500);
DROP INDEX idx_outbox_event_unpublished;
CREATE INDEX idx_outbox_event_unpublished ON outbox_event (id) WHERE published_at IS NULL AND parked_at IS NULL;
