package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.repository.OutboxEventRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OutboxMetricsTest {

    private final OutboxEventRepository outbox = mock(OutboxEventRepository.class);
    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-22T12:00:00Z"), ZoneOffset.UTC);

    @Test
    void reportsHowManyEventsWaitAndHowLongTheOldestHasWaited() {
        when(outbox.countByPublishedAtIsNull()).thenReturn(3L);
        when(outbox.oldestUnpublishedCreatedAt()).thenReturn(LocalDateTime.of(2026, 10, 22, 11, 58, 0));
        new OutboxMetrics(outbox, registry, clock);

        assertThat(registry.get("outbox.events.pending").gauge().value()).isEqualTo(3.0);
        assertThat(registry.get("outbox.oldest.pending.age").gauge().value()).isEqualTo(120.0);
    }

    @Test
    void nothingWaitingMeansZeroAge() {
        when(outbox.countByPublishedAtIsNull()).thenReturn(0L);
        when(outbox.oldestUnpublishedCreatedAt()).thenReturn(null);
        new OutboxMetrics(outbox, registry, clock);

        assertThat(registry.get("outbox.events.pending").gauge().value()).isZero();
        assertThat(registry.get("outbox.oldest.pending.age").gauge().value()).isZero();
    }
}
