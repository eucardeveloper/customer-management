-- Transactional outbox: an order and the event announcing it are written in ONE database transaction.
-- A relay publishes unpublished rows to Kafka afterwards, so a crash between "save" and "send" can no
-- longer lose the event (the row is still there and is published on the next run).
CREATE TABLE outbox_event (
    id           BIGSERIAL PRIMARY KEY,
    topic        VARCHAR(255)  NOT NULL,
    payload      VARCHAR(2000) NOT NULL,
    created_at   TIMESTAMP     NOT NULL,
    published_at TIMESTAMP
);
CREATE INDEX idx_outbox_event_unpublished ON outbox_event (id) WHERE published_at IS NULL;
