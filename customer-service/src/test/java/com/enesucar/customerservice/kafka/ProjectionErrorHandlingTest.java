package com.enesucar.customerservice.kafka;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.ConsumerRecordRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** No broker here: the wiring and the dead-letter step are checked, a real broker round trip is not. */
@SpringBootTest
class ProjectionErrorHandlingTest {

    @Autowired CommonErrorHandler errorHandler;

    @Test
    void theListenerUsesTheRetryAndDeadLetterHandler() {
        assertThat(errorHandler).isInstanceOf(DefaultErrorHandler.class);
    }

    @Test
    void aGivenUpEventIsPassedOnToTheDeadLetterTopicAndCounted() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        List<String> deadLettered = new ArrayList<>();
        ConsumerRecordRecoverer recoverer = ProjectionErrorHandling.countingRecoverer(
                (record, exception) -> deadLettered.add(record.key() + ":" + exception.getMessage()), registry);

        recoverer.accept(new ConsumerRecord<>("order-events", 0, 7L, "order-1", "{}"), new IllegalStateException("db down"));

        assertThat(deadLettered).containsExactly("order-1:db down");
        assertThat(registry.get(ProjectionErrorHandling.DLT_COUNTER).counter().count()).isEqualTo(1.0);
    }

    @Test
    void aGivenUpEventGoesToTheDocumentedDeadLetterTopic() {
        var target = ProjectionErrorHandling.deadLetterTopic(new ConsumerRecord<>("order-events", 0, 7L, "order-1", "{}"),
                new IllegalStateException("db down"));

        assertThat(target.topic()).isEqualTo("order-events.DLT");
    }
}
