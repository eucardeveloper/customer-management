package com.enesucar.orderservice.kafka;

import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import com.enesucar.orderservice.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Proves the outbox on a real PostgreSQL: creating an order writes the order and its event in one
 * transaction, the relay query returns pending rows, and a rollback leaves neither behind.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "app.kafka.enabled=false"
})
class OutboxIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @MockitoBean OrderProducer orderProducer;
    @MockitoBean CustomerClient customerClient;

    @Autowired OrderService orderService;
    @Autowired OutboxEventRepository outbox;
    @Autowired com.enesucar.orderservice.repository.OrderRepository orders;
    @Autowired TransactionTemplate tx;

    private OrderRequestDTO request() {
        OrderRequestDTO r = new OrderRequestDTO();
        r.setCustomerId(1L);
        r.setProductName("Outbox test item");
        r.setPrice(new BigDecimal("10.00"));
        r.setQuantity(1);
        return r;
    }

    @Test
    void creatingAnOrderWritesAnUnpublishedOutboxEvent() {
        when(customerClient.exists(1L)).thenReturn(true);
        long before = outbox.count();

        var created = orderService.createOrder(request());

        assertThat(outbox.count()).isEqualTo(before + 1);
        List<OutboxEvent> pending = tx.execute(s -> outbox.lockNextUnpublished(1000));
        assertThat(pending).anyMatch(e -> OrderEvent.parse(e.getPayload()).map(ev -> ev.orderId() == created.getId()).orElse(false)
                && e.getTopic().equals("order-events") && e.getPublishedAt() == null);
        // the monitoring queries behind the outbox gauges see it as waiting
        assertThat(outbox.countByPublishedAtIsNull()).isGreaterThanOrEqualTo(1);
        assertThat(outbox.oldestUnpublishedCreatedAt()).isNotNull();
    }

    @Test
    void aFailedCreateLeavesNoEventBehind() {
        when(customerClient.exists(1L)).thenReturn(true);
        long before = outbox.count();

        assertThatThrownBy(() -> tx.executeWithoutResult(s -> {
            orderService.createOrder(request());
            throw new IllegalStateException("something after the save failed");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(outbox.count()).isEqualTo(before);
    }

    @Test
    void anOrderWhoseCustomerIsDeletedWhileItIsBeingCreatedDoesNotSurvive() {
        // first check passes, the customer is deleted before the order commits, the re-check fails
        when(customerClient.exists(1L)).thenReturn(true, false);
        long ordersBefore = orders.count();

        assertThatThrownBy(() -> orderService.createOrder(request()))
                .isInstanceOf(com.enesucar.orderservice.exception.UnknownCustomerException.class);

        assertThat(orders.count()).isEqualTo(ordersBefore);
    }
}
