package com.enesucar.kundenservice.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class BestellungConsumer {

    @KafkaListener(topics = "bestellung-events", groupId = "kunden-group")
    public void mesajAl(String mesaj) {
        System.out.println("Kafka'dan mesaj geldi: " + mesaj);
    }
}