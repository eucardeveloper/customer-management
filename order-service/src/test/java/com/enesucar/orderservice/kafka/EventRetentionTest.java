package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.repository.OutboxEventRepository;
import com.enesucar.orderservice.repository.ProcessedEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class EventRetentionTest {

    @Test
    void deletesOnlyWhatIsOlderThanTheRetentionPeriod() {
        var outbox = mock(OutboxEventRepository.class);
        var processed = mock(ProcessedEventRepository.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-14T10:00:00Z"), ZoneOffset.UTC);

        new EventRetention(outbox, processed, Duration.ofDays(14), clock).purge();

        ArgumentCaptor<LocalDateTime> a = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> b = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(outbox).deletePublishedBefore(a.capture());
        verify(processed).deleteOlderThan(b.capture());
        assertThat(a.getValue()).isEqualTo(LocalDateTime.of(2026, 9, 30, 10, 0));
        assertThat(b.getValue()).isEqualTo(a.getValue());
    }
}
