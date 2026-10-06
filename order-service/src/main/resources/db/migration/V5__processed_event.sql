-- Durable idempotency record for the Kafka consumer.
-- Kafka delivers at-least-once: after a crash or rebalance the same record can be
-- delivered again. The key is "<group>:<topic>:<partition>:<offset>", which identifies a
-- record uniquely; the PRIMARY KEY makes a second insert fail even under concurrency.
CREATE TABLE processed_event (
    event_id     VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP NOT NULL
);
