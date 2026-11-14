package com.enesucar.orderservice.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/** Both services read "order-events" from the start when they have no committed position (no silent skip). */
class KafkaConfigTest {

    @Test
    void aNewConsumerGroupStartsAtTheBeginningLikeTheCustomerService() {
        KafkaConfig config = new KafkaConfig();
        ReflectionTestUtils.setField(config, "bootstrapServers", "localhost:9092");

        assertThat(config.consumerFactory().getConfigurationProperties())
                .containsEntry("auto.offset.reset", "earliest");
    }

    @Test
    void aFailedEventIsDeadLetteredToTheTopicTheListenerAndDocsNameAndNotSpringsDefault() {
        var target = KafkaConfig.deadLetterTopic(new ConsumerRecord<>("order-events", 0, 3L, "k", "v"),
                new IllegalStateException("boom"));

        assertThat(target.topic()).isEqualTo("order-events.DLT");
    }
}
