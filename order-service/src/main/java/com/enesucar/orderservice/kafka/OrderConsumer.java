package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.entity.ProcessedEvent;
import com.enesucar.orderservice.repository.ProcessedEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Consumes order events with a durable idempotency check.
 *
 * Kafka is at-least-once, so a record can be redelivered. Each record is identified by
 * group:topic:partition:offset and stored in processed_event inside the same transaction as
 * the handling work. A redelivery finds the row and is skipped; two concurrent deliveries
 * race on the primary key and exactly one commits. The state survives restarts (the previous
 * in-memory Set did not).
 *
 * The event payload is currently only a notification string ("Order created: id"), so the
 * handling step is a log line; any real side effect belongs inside handle() and is covered
 * by the same guarantee because it shares the transaction.
 */
@Component
public class OrderConsumer {

    static final String GROUP = "order-group";
    private static final Logger logger = LoggerFactory.getLogger(OrderConsumer.class);

    private final ProcessedEventRepository processedEvents;

    public OrderConsumer(ProcessedEventRepository processedEvents) {
        this.processedEvents = processedEvents;
    }

    @KafkaListener(topics = "order-events", groupId = GROUP)
    @Transactional
    public void consume(ConsumerRecord<String, String> record) {
        String eventId = GROUP + ":" + record.topic() + ":" + record.partition() + ":" + record.offset();

        if (processedEvents.existsById(eventId)) {
            logger.warn("Duplicate delivery, skipping: {}", eventId);
            return;
        }
        // A concurrent duplicate loses on the primary key: the exception rolls this transaction
        // back and the error handler redelivers, at which point existsById() above skips it.
        processedEvents.saveAndFlush(new ProcessedEvent(eventId, LocalDateTime.now()));
        handle(record.value());
    }

    private void handle(String message) {
        logger.info("Order event processed: {}", message);
    }

    @KafkaListener(topics = "order-events.DLT", groupId = "order-group-dlt")
    public void consumeDLT(String message) {
        logger.error("Dead Letter Queue message received: {}", message);
    }
}
