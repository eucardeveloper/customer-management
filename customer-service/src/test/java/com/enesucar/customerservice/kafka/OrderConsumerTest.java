package com.enesucar.customerservice.kafka;

import com.enesucar.customerservice.repository.OrderProjectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** The projection is built from order events; these run the consumer against a real (in-memory) database. */
@SpringBootTest
class OrderConsumerTest {

    @Autowired OrderConsumer consumer;
    @Autowired OrderProjectionRepository projection;

    @BeforeEach
    void clean() {
        projection.deleteAll();
    }

    private static String event(String type, long orderId, Long customerId) {
        return "{\"eventId\":\"e-" + type + orderId + "\",\"type\":\"" + type + "\",\"orderId\":" + orderId
                + (customerId == null ? "" : ",\"customerId\":" + customerId) + "}";
    }

    @Test
    void aCreatedOrderBelongsToItsCustomer() {
        consumer.consumeOrderEvent(event("ORDER_CREATED", 1, 10L));
        assertThat(projection.existsByCustomerId(10L)).isTrue();
        assertThat(projection.countByCustomerId(10L)).isEqualTo(1);
    }

    @Test
    void theSameEventTwiceLeavesTheSameState() {
        String created = event("ORDER_CREATED", 1, 10L);
        consumer.consumeOrderEvent(created);
        consumer.consumeOrderEvent(created);
        assertThat(projection.countByCustomerId(10L)).isEqualTo(1);
    }

    @Test
    void reassigningAnOrderMovesIt() {
        consumer.consumeOrderEvent(event("ORDER_CREATED", 1, 10L));
        consumer.consumeOrderEvent(event("ORDER_UPDATED", 1, 20L));
        assertThat(projection.existsByCustomerId(10L)).isFalse();
        assertThat(projection.existsByCustomerId(20L)).isTrue();
    }

    @Test
    void aDeletedOrderDisappears() {
        consumer.consumeOrderEvent(event("ORDER_CREATED", 1, 10L));
        consumer.consumeOrderEvent(event("ORDER_DELETED", 1, 10L));
        assertThat(projection.existsByCustomerId(10L)).isFalse();
    }

    @Test
    void deletingAnOrderTheProjectionNeverSawIsHarmless() {
        consumer.consumeOrderEvent(event("ORDER_DELETED", 99, 10L));
        assertThat(projection.count()).isZero();
    }

    @Test
    void messagesThatAreNotUsableAreSkippedNotRetried() {
        consumer.consumeOrderEvent("Order created: 7");                      // old plain-text message
        consumer.consumeOrderEvent("{not json");
        consumer.consumeOrderEvent(event("ORDER_CREATED", 2, null));          // published before customerId existed
        consumer.consumeOrderEvent(event("SOMETHING_NEW", 3, 10L));
        assertThat(projection.count()).isZero();
    }
}
