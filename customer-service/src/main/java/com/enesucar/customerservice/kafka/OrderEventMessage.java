package com.enesucar.customerservice.kafka;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;

/**
 * An order event as the order-service publishes it. Only the fields this service needs are read;
 * unknown fields are ignored so the publisher can add to the message without breaking this consumer.
 */
public record OrderEventMessage(String eventId, String type, long orderId, Long customerId) {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /** Empty for anything that is not a well-formed order event (older plain-text messages, garbage). */
    public static Optional<OrderEventMessage> parse(String message) {
        if (message == null || !message.startsWith("{")) {
            return Optional.empty();
        }
        try {
            OrderEventMessage event = MAPPER.readValue(message, OrderEventMessage.class);
            return event.type() == null ? Optional.empty() : Optional.of(event);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
