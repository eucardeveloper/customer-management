package com.enesucar.orderservice.kafka;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class OrderProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;

    public OrderProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /** Sends and waits for the broker's acknowledgement; throws if the event was not accepted. */
    public void publish(String topic, String payload) throws Exception {
        kafkaTemplate.send(topic, payload).get(5, TimeUnit.SECONDS);
    }

    /** Same, with a message key: events with the same key (one order) go to the same partition, in order. */
    public void publish(String topic, String key, String payload) throws Exception {
        kafkaTemplate.send(topic, key, payload).get(5, TimeUnit.SECONDS);
    }
}
