package com.enesucar.orderservice.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Component
public class OrderConsumer {

    private static final Logger logger = LoggerFactory.getLogger(OrderConsumer.class);
    private final Set<String> processedOrderIds = Collections.synchronizedSet(new HashSet<>());

    @KafkaListener(topics = "order-events", groupId = "order-group")
    public void consume(String message) {
        logger.info("Received Kafka message: {}", message);

        // Idempotency check — ayni mesaji iki kez isleme
        if (processedOrderIds.contains(message)) {
            logger.warn("Duplicate message detected, skipping: {}", message);
            return;
        }

        try {
            processedOrderIds.add(message);
            logger.info("Order event processed successfully: {}", message);
        } catch (Exception e) {
            processedOrderIds.remove(message);
            logger.error("Failed to process order event: {}", message, e);
            throw e;
        }
    }

    @KafkaListener(topics = "order-events.DLT", groupId = "order-group-dlt")
    public void consumeDLT(String message) {
        logger.error("Dead Letter Queue message received: {}", message);
    }
}

