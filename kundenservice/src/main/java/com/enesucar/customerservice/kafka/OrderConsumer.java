package com.enesucar.customerservice.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class OrderConsumer {

    @KafkaListener(topics = "bestellung-topic", groupId = "customer-group")
    public void consume(String message) {
        System.out.println("Received order message: " + message);
    }
}
