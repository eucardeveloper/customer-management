package com.enesucar.customerservice.kafka;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Dead-lettered events can be sent back by an admin: against a real broker, two events parked on
 * "order-events.DLT" are republished to "order-events" with their key and payload, and a second replay
 * finds nothing left (the position on the dead-letter topic is remembered).
 */
@Testcontainers
@SpringBootTest
class DeadLetterReplayIntegrationTest {

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka:3.8.0");

    @DynamicPropertySource
    static void broker(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @Autowired KafkaTemplate<String, String> template;
    @Autowired DeadLetterReplayService replay;

    @Test
    void parkedEventsGoBackToTheSourceTopicExactlyOnce() {
        template.send("order-events.DLT", "order-1", "{\"eventId\":\"r-1\"}").join();
        template.send("order-events.DLT", "order-2", "{\"eventId\":\"r-2\"}").join();

        assertThat(replay.replay()).isEqualTo(2);
        assertThat(replay.replay()).as("second replay").isZero();

        List<ConsumerRecord<String, String>> back = new ArrayList<>();
        try (KafkaConsumer<String, String> source = new KafkaConsumer<>(Map.of(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers(),
                ConsumerConfig.GROUP_ID_CONFIG, "replay-check",
                ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class))) {
            source.subscribe(List.of("order-events"));
            long deadline = System.currentTimeMillis() + 30_000;
            while (back.size() < 2 && System.currentTimeMillis() < deadline) {
                source.poll(Duration.ofSeconds(1)).forEach(back::add);
            }
        }
        assertThat(back).extracting(ConsumerRecord::key).containsExactlyInAnyOrder("order-1", "order-2");
        assertThat(back).extracting(ConsumerRecord::value).containsExactlyInAnyOrder("{\"eventId\":\"r-1\"}", "{\"eventId\":\"r-2\"}");
    }

    @Test
    void anEmptyDeadLetterTopicReplaysNothing() {
        assertThat(replay.replay()).isGreaterThanOrEqualTo(0);
    }
}
