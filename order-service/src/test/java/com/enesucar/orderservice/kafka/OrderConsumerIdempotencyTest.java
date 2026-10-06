package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.repository.ProcessedEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the real Flyway chain (V1..V5) on PostgreSQL with Hibernate in validate mode, so a
 * drift between the entities and the migrations fails here instead of in production, and
 * proves that a redelivered Kafka record is handled exactly once. No broker is needed:
 * the listener method is called directly with the same record twice.
 * Skipped automatically when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "app.kafka.enabled=false"
})
class OrderConsumerIdempotencyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @MockitoBean
    OrderProducer orderProducer;

    @Autowired OrderConsumer consumer;
    @Autowired ProcessedEventRepository processedEvents;
    @Autowired JdbcTemplate jdbc;

    @Test
    void redeliveredRecordIsRecordedOnlyOnce() {
        ConsumerRecord<String, String> record = new ConsumerRecord<>("order-events", 0, 42L, null, "Order created: 7");

        consumer.consume(record);
        consumer.consume(record); // at-least-once redelivery

        assertThat(processedEvents.count()).isEqualTo(1);
        assertThat(processedEvents.existsById("order-group:order-events:0:42")).isTrue();
    }

    @Test
    void differentOffsetsAreDifferentEvents() {
        long before = processedEvents.count();
        consumer.consume(new ConsumerRecord<>("order-events", 0, 100L, null, "Order created: 8"));
        consumer.consume(new ConsumerRecord<>("order-events", 0, 101L, null, "Order created: 8"));

        assertThat(processedEvents.count()).isEqualTo(before + 2);
    }

    @Test
    void flywayAppliedTheWholeChain() {
        Integer applied = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success", Integer.class);
        assertThat(applied).isGreaterThanOrEqualTo(4);
    }
}
