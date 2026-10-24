package com.enesucar.customerservice.kafka;

import com.enesucar.customerservice.entity.OrderProjection;
import com.enesucar.customerservice.repository.OrderProjectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Keeps the order projection (which order belongs to which customer) up to date from "order-events".
 *
 * <p>The handling is naturally idempotent: ORDER_CREATED and ORDER_UPDATED set the order's customer
 * (an upsert), ORDER_DELETED removes the row. Redelivery, or the same event published twice by the
 * outbox relay, leaves the same state. Events for one order share a message key, so they arrive in
 * order. Messages that are not order events, or that carry no customer (published before the field
 * existed), are logged and skipped, never retried: retrying cannot make them valid.
 */
@Component
public class OrderConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderConsumer.class);

    private final OrderProjectionRepository projection;

    public OrderConsumer(OrderProjectionRepository projection) {
        this.projection = projection;
    }

    // autoStartup is only switched off by the test configuration (there is no broker there).
    @KafkaListener(topics = "order-events", groupId = "customer-group",
            autoStartup = "${app.kafka.listener.auto-startup:true}")
    @Transactional
    public void consumeOrderEvent(String message) {
        OrderEventMessage event = OrderEventMessage.parse(message).orElse(null);
        if (event == null) {
            log.warn("Skipping a message on order-events that is not an order event");
            return;
        }
        switch (event.type()) {
            case "ORDER_CREATED", "ORDER_UPDATED" -> {
                if (event.customerId() == null) {
                    log.warn("Skipping {} for order {}: the event names no customer", event.type(), event.orderId());
                    return;
                }
                projection.save(new OrderProjection(event.orderId(), event.customerId(), LocalDateTime.now()));
            }
            case "ORDER_DELETED" -> projection.findById(event.orderId()).ifPresent(projection::delete);
            default -> log.warn("Skipping unknown order event type {}", event.type());
        }
    }
}
