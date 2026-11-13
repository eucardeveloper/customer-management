package com.enesucar.orderservice.kafka;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The relay holds a database transaction while it waits for the broker, so the producer's waits are bounded
 * explicitly. Reads the real properties file (the test resources carry their own application.properties).
 */
class ProducerTimeoutConfigTest {

    @Test
    void producerWaitsAreBoundedAndConsistent() throws IOException {
        Properties p = new Properties();
        try (var in = Files.newInputStream(Path.of("src/main/resources/application.properties"))) {
            p.load(in);
        }
        int maxBlock = Integer.parseInt(p.getProperty("spring.kafka.producer.properties.max.block.ms"));
        int request = Integer.parseInt(p.getProperty("spring.kafka.producer.properties.request.timeout.ms"));
        int delivery = Integer.parseInt(p.getProperty("spring.kafka.producer.properties.delivery.timeout.ms"));

        assertThat(maxBlock).isLessThanOrEqualTo(5_000);
        assertThat(delivery).isLessThanOrEqualTo(10_000);
        assertThat(delivery).as("Kafka requires delivery.timeout.ms >= request.timeout.ms + linger.ms").isGreaterThanOrEqualTo(request);
    }
}
