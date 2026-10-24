package com.enesucar.orderservice.kafka;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderEventTest {

    @Test
    void roundTripsThroughJson() {
        OrderEvent event = OrderEvent.created(42, 1L);
        OrderEvent parsed = OrderEvent.parse(event.toJson()).orElseThrow();
        assertThat(parsed).isEqualTo(event);
        assertThat(parsed.type()).isEqualTo("ORDER_CREATED");
    }

    @Test
    void everyEventGetsItsOwnId() {
        assertThat(OrderEvent.created(1, 1L).eventId()).isNotEqualTo(OrderEvent.created(1, 1L).eventId());
    }

    @Test
    void plainTextAndGarbageAreNotOrderEvents() {
        assertThat(OrderEvent.parse("Order created: 7")).isEmpty();
        assertThat(OrderEvent.parse("{not json")).isEmpty();
        assertThat(OrderEvent.parse("{\"type\":\"ORDER_CREATED\",\"orderId\":1}")).isEmpty(); // no event id
        assertThat(OrderEvent.parse(null)).isEmpty();
    }

    @Test
    void updatedAndDeletedEventsCarryTheirType() {
        assertThat(OrderEvent.parse(OrderEvent.updated(5, 1L).toJson()).orElseThrow().type()).isEqualTo("ORDER_UPDATED");
        assertThat(OrderEvent.parse(OrderEvent.deleted(5, 1L).toJson()).orElseThrow().type()).isEqualTo("ORDER_DELETED");
    }

    @Test
    void everyEventNamesTheCustomerOfTheOrder() {
        assertThat(OrderEvent.parse(OrderEvent.created(5, 9L).toJson()).orElseThrow().customerId()).isEqualTo(9L);
    }

    @Test
    void eventsFromBeforeTheCustomerFieldExistedStillParse() {
        OrderEvent old = OrderEvent.parse("{\"eventId\":\"e-1\",\"type\":\"ORDER_CREATED\",\"orderId\":3}").orElseThrow();
        assertThat(old.customerId()).isNull();
    }
}
