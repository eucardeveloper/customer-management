package com.enesucar.orderservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

/**
 * The message published on "order-events". It carries its own business id, so a consumer can recognise
 * the same event even when it arrives twice at different Kafka offsets (for example when the outbox
 * relay publishes a row again after a crash).
 *
 * <p>{@code customerId} is the customer the order belongs to <i>after</i> the change. It lets a consumer in
 * another service keep a read model of "which orders belong to which customer" without calling back.
 * Events published before the field existed have none ({@code null}); consumers must tolerate that.
 */
public record OrderEvent(String eventId, String type, long orderId, Long customerId) {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static OrderEvent created(long orderId, Long customerId) {
        return new OrderEvent(UUID.randomUUID().toString(), "ORDER_CREATED", orderId, customerId);
    }

    public static OrderEvent updated(long orderId, Long customerId) {
        return new OrderEvent(UUID.randomUUID().toString(), "ORDER_UPDATED", orderId, customerId);
    }

    public static OrderEvent deleted(long orderId, Long customerId) {
        return new OrderEvent(UUID.randomUUID().toString(), "ORDER_DELETED", orderId, customerId);
    }

    public String toJson() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot serialise order event", e);
        }
    }

    /** Empty for anything that is not a well-formed order event (older plain-text messages, garbage). */
    public static Optional<OrderEvent> parse(String message) {
        if (message == null || !message.startsWith("{")) {
            return Optional.empty();
        }
        try {
            OrderEvent event = MAPPER.readValue(message, OrderEvent.class);
            return event.eventId() == null || event.eventId().isBlank() ? Optional.empty() : Optional.of(event);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
