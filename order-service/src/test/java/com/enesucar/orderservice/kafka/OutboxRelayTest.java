package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;

import org.apache.kafka.common.errors.RecordTooLargeException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

class OutboxRelayTest {

    private final OutboxEventRepository outbox = mock(OutboxEventRepository.class);
    private final OrderProducer producer = mock(OrderProducer.class);
    private final OutboxRelay relay = new OutboxRelay(outbox, producer);

    @Test
    void publishesPendingEvents_andMarksThemPublished() throws Exception {
        OutboxEvent a = new OutboxEvent("order-events", "Order created: 1");
        OutboxEvent b = new OutboxEvent("order-events", "Order created: 2");
        when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of(a, b));

        relay.publishPending();

        verify(producer).publish("order-events", "Order created: 1");
        verify(producer).publish("order-events", "Order created: 2");
        assertThat(a.getPublishedAt()).isNotNull();
        assertThat(b.getPublishedAt()).isNotNull();
    }

    @Test
    void leavesEventUnpublished_whenBrokerDoesNotAcknowledge_andKeepsOrder() throws Exception {
        OutboxEvent a = new OutboxEvent("order-events", "Order created: 1");
        OutboxEvent b = new OutboxEvent("order-events", "Order created: 2");
        when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of(a, b));
        doThrow(new RuntimeException("broker down")).when(producer).publish("order-events", "Order created: 1");

        relay.publishPending();

        assertThat(a.getPublishedAt()).isNull();
        assertThat(b.getPublishedAt()).isNull(); // not attempted: order is preserved
        verify(producer, never()).publish("order-events", "Order created: 2");
    }

    @Test
    void doesNothing_whenThereIsNothingToPublish() throws Exception {
        when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of());
        relay.publishPending();
        verifyNoInteractions(producer);
    }

    @Test
    void jsonEventsAreKeyedByOrderSoOneOrdersEventsStayInOrder() throws Exception {
        OutboxEvent created = new OutboxEvent("order-events", OrderEvent.created(7).toJson());
        OutboxEvent updated = new OutboxEvent("order-events", OrderEvent.updated(7).toJson());
        when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of(created, updated));

        relay.publishPending();

        verify(producer).publish("order-events", "order-7", created.getPayload());
        verify(producer).publish("order-events", "order-7", updated.getPayload());
        assertThat(updated.getPublishedAt()).isNotNull();
    }

    @Test
    void aTransientFailureNeverCountsTowardParking() throws Exception {
        OutboxEvent a = new OutboxEvent("order-events", "Order created: 1");
        when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of(a));
        doThrow(new RuntimeException("broker down")).when(producer).publish("order-events", "Order created: 1");

        for (int i = 0; i < 10; i++) {
            relay.publishPending();
        }

        assertThat(a.getAttempts()).isZero();
        assertThat(a.getParkedAt()).isNull();
    }

    @Test
    void aPoisonEventIsParkedAfterThreeAttempts_andTheEventsBehindItGoThrough() throws Exception {
        OutboxEvent poison = new OutboxEvent("order-events", "Order created: 1");
        OutboxEvent next = new OutboxEvent("order-events", "Order created: 2");
        doThrow(new java.util.concurrent.ExecutionException(new RecordTooLargeException("too big")))
                .when(producer).publish("order-events", "Order created: 1");

        for (int i = 0; i < OutboxRelay.MAX_PERMANENT_ATTEMPTS; i++) {
            when(outbox.lockNextUnpublished(anyInt())).thenReturn(List.of(poison, next));
            relay.publishPending();
        }

        assertThat(poison.getAttempts()).isEqualTo(OutboxRelay.MAX_PERMANENT_ATTEMPTS);
        assertThat(poison.getParkedAt()).isNotNull();
        assertThat(poison.getPublishedAt()).isNull();
        assertThat(next.getPublishedAt()).isNotNull(); // the parked event no longer blocks the queue
    }

    @Test
    void classifiesBrokerErrorsAsPermanentOrTransient() {
        assertThat(OutboxRelay.isPermanent(new java.util.concurrent.ExecutionException(new RecordTooLargeException("x")))).isTrue();
        assertThat(OutboxRelay.isPermanent(new org.apache.kafka.common.errors.TimeoutException("x"))).isFalse();
        assertThat(OutboxRelay.isPermanent(new RuntimeException("x"))).isFalse();
    }
}
