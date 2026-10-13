package com.enesucar.orderservice.kafka;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderEventTest {

    @Test
    void roundTripsThroughJson() {
        OrderEvent event = OrderEvent.created(42);
        OrderEvent parsed = OrderEvent.parse(event.toJson()).orElseThrow();
        assertThat(parsed).isEqualTo(event);
        assertThat(parsed.type()).isEqualTo("ORDER_CREATED");
    }

    @Test
    void everyEventGetsItsOwnId() {
        assertThat(OrderEvent.created(1).eventId()).isNotEqualTo(OrderEvent.created(1).eventId());
    }

    @Test
    void plainTextAndGarbageAreNotOrderEvents() {
        assertThat(OrderEvent.parse("Order created: 7")).isEmpty();
        assertThat(OrderEvent.parse("{not json")).isEmpty();
        assertThat(OrderEvent.parse("{\"type\":\"ORDER_CREATED\",\"orderId\":1}")).isEmpty(); // no event id
        assertThat(OrderEvent.parse(null)).isEmpty();
    }
}
