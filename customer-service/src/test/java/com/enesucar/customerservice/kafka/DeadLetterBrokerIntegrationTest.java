package com.enesucar.customerservice.kafka;

import com.enesucar.customerservice.repository.OrderProjectionRepository;
import io.micrometer.core.instrument.MeterRegistry;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * The dead-letter path against a real broker: an order event the projection cannot apply is retried and then
 * lands on "order-events.DLT" with its original payload, and the counter moves. The unit test next to it
 * only proves the recoverer in isolation; this one proves the listener, the retry handler and the broker
 * work together. The database failure is simulated by a repository that throws.
 */
@Testcontainers
@SpringBootTest(properties = {
        "app.kafka.listener.auto-startup=true",
        // the test resources replace the production properties, where this is "earliest": without it the listener
        // starts at the end of the topic and can miss an event sent right after start-up
        "spring.kafka.consumer.auto-offset-reset=earliest"
})
class DeadLetterBrokerIntegrationTest {

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka:3.8.0");

    @DynamicPropertySource
    static void broker(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @MockitoBean OrderProjectionRepository projection;
    @Autowired KafkaTemplate<String, String> template;
    @Autowired MeterRegistry meters;

    @Test
    void anEventThatKeepsFailingEndsUpOnTheDeadLetterTopic() {
        when(projection.save(any())).thenThrow(new IllegalStateException("database unavailable"));
        String payload = "{\"eventId\":\"e-dlt-1\",\"type\":\"ORDER_CREATED\",\"orderId\":77,\"customerId\":5}";

        template.send("order-events", "order-77", payload).join();

        try (KafkaConsumer<String, String> dlt = new KafkaConsumer<>(Map.of(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA.getBootstrapServers(),
                ConsumerConfig.GROUP_ID_CONFIG, "dlt-reader",
                ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
                // the dead-letter topic does not exist yet when this consumer subscribes (the broker creates it on
                // the first publish); by default a consumer would only notice it after five minutes
                ConsumerConfig.METADATA_MAX_AGE_CONFIG, 1000,
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class))) {
            dlt.subscribe(List.of("order-events.DLT"));
            ConsumerRecord<String, String> dead = null;
            // three retries, three seconds apart, then the publish: well under a minute
            long deadline = System.currentTimeMillis() + 90_000;
            while (dead == null && System.currentTimeMillis() < deadline) {
                for (ConsumerRecord<String, String> record : dlt.poll(Duration.ofSeconds(2))) {
                    dead = record;
                }
            }
            assertThat(dead).as("a record on order-events.DLT").isNotNull();
            assertThat(dead.key()).isEqualTo("order-77");
            assertThat(dead.value()).isEqualTo(payload);
        }
        assertThat(meters.get(ProjectionErrorHandling.DLT_COUNTER).counter().count()).isGreaterThanOrEqualTo(1.0);
    }
}
