package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.repository.OutboxEventRepository;
import com.enesucar.orderservice.repository.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Keeps the outbox and the idempotency table from growing without end: published outbox rows and
 * processed-event records older than the retention period are deleted once a day. The period must stay
 * longer than Kafka's own retention for the topic (7 days by default), because a record older than
 * that cannot be redelivered anyway.
 */
@Component
public class EventRetention {

    private static final Logger logger = LoggerFactory.getLogger(EventRetention.class);

    private final OutboxEventRepository outbox;
    private final ProcessedEventRepository processed;
    private final Duration retention;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public EventRetention(OutboxEventRepository outbox, ProcessedEventRepository processed,
                          @Value("${app.events.retention-days:14}") long retentionDays) {
        this(outbox, processed, Duration.ofDays(retentionDays), Clock.systemDefaultZone());
    }

    EventRetention(OutboxEventRepository outbox, ProcessedEventRepository processed, Duration retention, Clock clock) {
        this.outbox = outbox;
        this.processed = processed;
        this.retention = retention;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.events.cleanup-ms:86400000}", initialDelay = 120_000)
    public void purge() {
        LocalDateTime cutoff = LocalDateTime.now(clock).minus(retention);
        int a = outbox.deletePublishedBefore(cutoff);
        int b = processed.deleteOlderThan(cutoff);
        if (a + b > 0) {
            logger.info("Event housekeeping: removed {} published outbox rows and {} processed-event records", a, b);
        }
    }
}
