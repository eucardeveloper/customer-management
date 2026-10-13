package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Publishes outbox rows to Kafka. A row is marked published only after the broker acknowledged it, in
 * the same transaction that holds its lock; if publishing fails the transaction rolls back and the row
 * is retried on the next run. Delivery is therefore at-least-once (a crash after the broker accepted
 * but before the commit publishes it again), which the idempotent consumer already tolerates.
 */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxRelay {

    static final int BATCH_SIZE = 50;
    private static final Logger logger = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxEventRepository outbox;
    private final OrderProducer producer;

    public OutboxRelay(OutboxEventRepository outbox, OrderProducer producer) {
        this.outbox = outbox;
        this.producer = producer;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-ms:1000}")
    @Transactional
    public void publishPending() {
        List<OutboxEvent> batch = outbox.lockNextUnpublished(BATCH_SIZE);
        for (OutboxEvent event : batch) {
            try {
                producer.publish(event.getTopic(), event.getPayload());
            } catch (Exception e) {
                logger.warn("Outbox event {} not published yet, will retry: {}", event.getId(), e.toString());
                // Keep order: stop here, the row (and the ones behind it) stay unpublished.
                break;
            }
            event.markPublished();
        }
    }
}
