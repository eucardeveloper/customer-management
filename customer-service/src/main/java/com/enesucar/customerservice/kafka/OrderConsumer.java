package com.enesucar.customerservice.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderConsumer.class);

    // autoStartup is only switched off by the test configuration (there is no broker there).
    @KafkaListener(topics = "order-events", groupId = "customer-group",
            autoStartup = "${app.kafka.listener.auto-startup:true}")
    public void consumeOrderEvent(String message) {
        log.info("Order event received: {}", message);
    }
}
