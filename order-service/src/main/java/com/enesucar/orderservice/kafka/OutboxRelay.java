package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.apache.kafka.common.errors.InvalidTopicException;
import org.apache.kafka.common.errors.RecordTooLargeException;
import org.apache.kafka.common.errors.SerializationException;
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
    /** Permanent failures tolerated before an event is parked (transient ones, e.g. broker down, never count). */
    static final int MAX_PERMANENT_ATTEMPTS = 3;
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
                // Key by order id: Kafka keeps the events of one order in one partition, in the order sent.
                var parsed = OrderEvent.parse(event.getPayload());
                if (parsed.isPresent()) {
                    producer.publish(event.getTopic(), "order-" + parsed.get().orderId(), event.getPayload());
                } else {
                    producer.publish(event.getTopic(), event.getPayload());
                }
            } catch (Exception e) {
                if (isPermanent(e)) {
                    // Retrying cannot help (e.g. message too large): count it and, after a few tries, park the
                    // event so it stops blocking every event behind it.
                    event.recordPermanentFailure(e.toString());
                    if (event.getAttempts() >= MAX_PERMANENT_ATTEMPTS) {
                        event.park();
                        logger.error("Outbox event {} parked after {} permanent failures: {}",
                                event.getId(), event.getAttempts(), e.toString());
                        continue;
                    }
                    logger.warn("Outbox event {} failed permanently ({} of {}): {}",
                            event.getId(), event.getAttempts(), MAX_PERMANENT_ATTEMPTS, e.toString());
                } else {
                    logger.warn("Outbox event {} not published yet, will retry: {}", event.getId(), e.toString());
                }
                // Keep order: stop here, the row (and the ones behind it) stay unpublished.
                break;
            }
            event.markPublished();
        }
    }

    /** True when the error is in the event itself, so sending it again can never succeed. */
    static boolean isPermanent(Throwable error) {
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (t instanceof RecordTooLargeException
                    || t instanceof InvalidTopicException
                    || t instanceof SerializationException) {
                return true;
            }
            if (t.getCause() == t) {
                break;
            }
        }
        return false;
    }
}
