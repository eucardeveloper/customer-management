-- Read model of the order-service's events: which order belongs to which customer.
-- It is filled from the "order-events" topic (see OrderConsumer) and is only ever a hint: the
-- authoritative answer to "does this customer have orders" is still the order-service itself.
-- Orders that existed before this table do not appear here until their next event.
CREATE TABLE order_projection (
    order_id    BIGINT    PRIMARY KEY,
    customer_id BIGINT    NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_order_projection_customer ON order_projection (customer_id);
