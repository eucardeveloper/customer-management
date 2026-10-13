package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;

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
}
