package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.repository.OutboxEventRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * The outbox guarantees an event is not lost; these two gauges show whether it is stuck. A growing
 * {@code outbox_events_pending} or an {@code outbox_oldest_pending_age_seconds} above a few seconds means
 * Kafka is not acknowledging (broker down, wrong address), which no error page would ever show.
 * Read at scrape time (every 15 s); both queries use the partial index on unpublished rows.
 */
@Component
public class OutboxMetrics {

    @Autowired
    public OutboxMetrics(OutboxEventRepository outbox, MeterRegistry registry) {
        this(outbox, registry, Clock.systemDefaultZone());
    }

    OutboxMetrics(OutboxEventRepository outbox, MeterRegistry registry, Clock clock) {
        Gauge.builder("outbox.events.pending", outbox, OutboxEventRepository::countPending)
                .description("Order events written to the outbox but not yet acknowledged by Kafka")
                .register(registry);
        Gauge.builder("outbox.events.parked", outbox, OutboxEventRepository::countByParkedAtIsNotNull)
                .description("Order events given up on after permanent publish failures (needs attention)")
                .register(registry);
        Gauge.builder("outbox.oldest.pending.age", outbox, r -> ageSeconds(r.oldestUnpublishedCreatedAt(), clock))
                .description("Seconds the oldest unpublished outbox event has been waiting (0 when none)")
                .baseUnit("seconds")
                .register(registry);
    }

    /** createdAt is written with LocalDateTime.now(), i.e. in this JVM's zone, so the same zone is used here. */
    static double ageSeconds(LocalDateTime oldest, Clock clock) {
        if (oldest == null) {
            return 0;
        }
        return Math.max(0, Duration.between(oldest, LocalDateTime.now(clock)).toMillis() / 1000.0);
    }
}
