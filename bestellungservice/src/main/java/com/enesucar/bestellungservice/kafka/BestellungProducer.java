package com.enesucar.bestellungservice.kafka;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BestellungProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private static final String TOPIC = "bestellung-events";

    public void bestellungGönder(String mesaj) {
        kafkaTemplate.send(TOPIC, mesaj);
    }
}