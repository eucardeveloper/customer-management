package com.enesucar.customerservice.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderConsumer {

    @KafkaListener(topics = "order-events", groupId = "customer-group")
    public void consumeOrderEvent(String message) {
        System.out.println("Order event received: " + message);
    }
}
