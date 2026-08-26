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
            kafkaTemplate.send("order-events", message)
                    .whenComplete((result, ex) -> {
                        if (ex == null) {
                            logger.info("Order event sent successfully: topic={}, offset={}",
                                    result.getRecordMetadata().topic(),
                                    result.getRecordMetadata().offset());
                        } else {
                            logger.error("Failed to send order event, routing to DLQ: {}", message, ex);
                            sendToDLQ(message);
                        }
                    });
        } catch (Exception e) {
            logger.error("Unexpected error sending order event: {}", message, e);
            sendToDLQ(message);
        }
    }

    private void sendToDLQ(String message) {
        try {
            kafkaTemplate.send("order-events.DLT", message);
            logger.warn("Message sent to DLQ: {}", message);
        } catch (Exception e) {
            logger.error("Failed to send message to DLQ as well: {}", message, e);
        }
    }
}