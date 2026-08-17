package com.enesucar.orderservice.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderProducer {

    private static final Logger logger = LoggerFactory.getLogger(OrderProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;

    public OrderProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendOrderEvent(String message) {
        try {
            kafkaTemplate.send("order-events", message);
            logger.info("Kafka event sent: {}", message);
        } catch (Exception e) {
            logger.warn("Kafka event could not be sent, continuing without Kafka: {}", e.getMessage());
        }
    }
}