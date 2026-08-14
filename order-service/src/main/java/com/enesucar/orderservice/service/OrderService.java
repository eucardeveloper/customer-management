package com.enesucar.orderservice.service;

import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.kafka.OrderProducer;
import com.enesucar.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderProducer orderProducer;

    public OrderService(OrderRepository orderRepository, OrderProducer orderProducer) {
        this.orderRepository = orderRepository;
        this.orderProducer = orderProducer;
    }

    public List<OrderResponseDTO> getAllOrders() {
        return orderRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public OrderResponseDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        return toResponseDTO(order);
    }

    public List<OrderResponseDTO> getOrdersByCustomerId(Long customerId) {
        return orderRepository.findByCustomerId(customerId)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public OrderResponseDTO createOrder(OrderRequestDTO dto) {
        Order order = new Order();
        order.setCustomerId(dto.getCustomerId());
        order.setProduct(dto.getProduct());
        order.setQuantity(dto.getQuantity());
        order.setPrice(dto.getPrice());
        Order saved = orderRepository.save(order);
        orderProducer.sendOrderMessage("New order created: " + saved.getId());
        return toResponseDTO(saved);
    }

    public OrderResponseDTO updateOrder(Long id, OrderRequestDTO dto) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        order.setCustomerId(dto.getCustomerId());
        order.setProduct(dto.getProduct());
        order.setQuantity(dto.getQuantity());
        order.setPrice(dto.getPrice());
        Order updated = orderRepository.save(order);
        return toResponseDTO(updated);
    }

    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        orderRepository.delete(order);
    }

    private OrderResponseDTO toResponseDTO(Order order) {
        OrderResponseDTO dto = new OrderResponseDTO();
        dto.setId(order.getId());
        dto.setCustomerId(order.getCustomerId());
        dto.setProduct(order.getProduct());
        dto.setQuantity(order.getQuantity());
        dto.setPrice(order.getPrice());
        return dto;
    }
}
