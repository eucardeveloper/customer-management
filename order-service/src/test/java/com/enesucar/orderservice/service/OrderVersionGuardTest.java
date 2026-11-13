package com.enesucar.orderservice.service;

import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.exception.StaleVersionException;
import com.enesucar.orderservice.repository.OrderAuditRepository;
import com.enesucar.orderservice.repository.OrderRepository;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** An edit based on an older copy of an order is refused; an edit of an order that is gone is a 404. */
@ExtendWith(MockitoExtension.class)
class OrderVersionGuardTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OutboxEventRepository outbox;
    @Mock private OrderAuditRepository audits;
    @Mock private CustomerClient customerClient;
    @Mock private PlatformTransactionManager transactionManager;
    @InjectMocks private OrderService orderService;

    private static OrderRequestDTO request(Long version) {
        OrderRequestDTO r = new OrderRequestDTO();
        r.setCustomerId(1L);
        r.setProductName("Widget");
        r.setPrice(new BigDecimal("10.00"));
        r.setQuantity(1);
        r.setVersion(version);
        return r;
    }

    @Test
    void anEditBasedOnAnOlderVersionIsRefused() {
        Order stored = new Order();
        stored.setId(9L);
        stored.setCustomerId(1L);
        stored.setVersion(4L);
        when(orderRepository.findById(9L)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> orderService.updateOrder(9L, request(3L))).isInstanceOf(StaleVersionException.class);

        verify(orderRepository, never()).save(any());
    }

    @Test
    void editingAnOrderThatIsGoneIsNotFound() {
        when(orderRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.updateOrder(9L, request(1L))).isInstanceOf(ResourceNotFoundException.class);
    }
}
