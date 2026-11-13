package com.enesucar.customerservice.kafka;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ConsumerRecordRecoverer;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * What happens when the order projection cannot apply an event. Spring Boot picks this handler up for the
 * "order-events" listener. Without it Kafka's default gives up after a few immediate retries and drops the
 * event, and the projection would lose it silently.
 *
 * <p>Here a failing event is retried three more times, three seconds apart (a database hiccup usually
 * passes in that time). If it still fails it is published to the dead-letter topic "order-events.DLT",
 * logged as an error and counted in {@code customer_projection_dlt_total}, so it can be inspected and
 * replayed by a person. The same pattern the order-service uses for its own consumer.
 */
@Configuration
public class ProjectionErrorHandling {

    static final String DLT_COUNTER = "customer.projection.dlt";
    private static final Logger log = LoggerFactory.getLogger(ProjectionErrorHandling.class);

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template, MeterRegistry registry) {
        return new DefaultErrorHandler(countingRecoverer(new DeadLetterPublishingRecoverer(template), registry),
                new FixedBackOff(3000L, 3));
    }

    /** Wraps the real dead-letter publisher so every event that reaches it is logged and counted. */
    static ConsumerRecordRecoverer countingRecoverer(ConsumerRecordRecoverer delegate, MeterRegistry registry) {
        Counter counter = Counter.builder(DLT_COUNTER)
                .description("Order events the customer-service gave up applying and sent to the dead-letter topic")
                .register(registry);
        return (record, exception) -> {
            counter.increment();
            log.error("Order event {}-{}@{} could not be applied after retries; sending it to the dead-letter topic",
                    record.topic(), record.partition(), record.offset(), exception);
            delegate.accept(record, exception);
        };
    }
}
