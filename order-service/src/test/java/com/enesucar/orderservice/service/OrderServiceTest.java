package com.enesucar.orderservice.service;

import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.kafka.OrderProducer;
import com.enesucar.orderservice.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderProducer orderProducer;

    @InjectMocks
    private OrderService orderService;

    private Order order;
    private OrderRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(1L);
        order.setCustomerId(10L);
        order.setProductName("Laptop");
        order.setPrice(new BigDecimal("1500.00"));
        order.setQuantity(1);
        order.setDate(LocalDateTime.now());
        order.setStatus("PENDING");

        requestDTO = new OrderRequestDTO();
        requestDTO.setCustomerId(10L);
        requestDTO.setProductName("Laptop");
        requestDTO.setPrice(new BigDecimal("1500.00"));
        requestDTO.setQuantity(1);
        requestDTO.setStatus("PENDING");
    }

    @Test
    void getAllOrders_shouldReturnList() {
        when(orderRepository.findAll()).thenReturn(List.of(order));
        List<OrderResponseDTO> result = orderService.getAllOrders();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProductName()).isEqualTo("Laptop");
    }

    @Test
    void getAllOrders_shouldReturnEmptyList_whenNoOrders() {
        when(orderRepository.findAll()).thenReturn(List.of());
        List<OrderResponseDTO> result = orderService.getAllOrders();
        assertThat(result).isEmpty();
    }

    @Test
    void getOrdersByCustomerId_shouldReturnList() {
        when(orderRepository.findByCustomerId(10L)).thenReturn(List.of(order));
        List<OrderResponseDTO> result = orderService.getOrdersByCustomerId(10L);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCustomerId()).isEqualTo(10L);
    }

    @Test
    void createOrder_shouldSaveAndSendKafkaEvent() {
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        doNothing().when(orderProducer).sendOrderEvent(anyString());
        OrderResponseDTO result = orderService.createOrder(requestDTO);
        assertThat(result.getProductName()).isEqualTo("Laptop");
        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(orderRepository).save(any(Order.class));
        verify(orderProducer).sendOrderEvent(anyString());
    }

    @Test
    void createOrder_shouldSetDefaultStatus_whenStatusIsNull() {
        requestDTO.setStatus(null);
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        doNothing().when(orderProducer).sendOrderEvent(anyString());
        OrderResponseDTO result = orderService.createOrder(requestDTO);
        assertThat(result).isNotNull();
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void getOrderById_shouldReturnOrder_whenExists() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        OrderResponseDTO result = orderService.getOrderById(1L);
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getProductName()).isEqualTo("Laptop");
    }

    @Test
    void getOrderById_shouldThrowException_whenNotFound() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> orderService.getOrderById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Order not found with ID: 99");
    }

    @Test
    void updateOrder_shouldUpdateAndReturn_whenExists() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        OrderResponseDTO result = orderService.updateOrder(1L, requestDTO);
        assertThat(result.getProductName()).isEqualTo("Laptop");
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void updateOrder_shouldThrowException_whenNotFound() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> orderService.updateOrder(99L, requestDTO))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Order not found with ID: 99");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void deleteOrder_shouldDelete_whenExists() {
        when(orderRepository.existsById(1L)).thenReturn(true);
        doNothing().when(orderRepository).deleteById(1L);
        orderService.deleteOrder(1L);
        verify(orderRepository).deleteById(1L);
    }

    @Test
    void deleteOrder_shouldThrowException_whenNotFound() {
        when(orderRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> orderService.deleteOrder(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Order not found with ID: 99");
        verify(orderRepository, never()).deleteById(any());
    }
}