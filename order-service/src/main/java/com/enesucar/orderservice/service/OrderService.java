package com.enesucar.orderservice.service;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.kafka.OrderProducer;
import com.enesucar.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
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
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    public List<OrderResponseDTO> getOrdersByCustomerId(Long customerId) {
        return orderRepository.findByCustomerId(customerId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    public OrderResponseDTO createOrder(OrderRequestDTO request) {
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setProductName(request.getProductName());
        order.setPrice(request.getPrice());
        order.setQuantity(request.getQuantity());
        order.setDate(LocalDateTime.now());
		order.setStatus(request.getStatus() != null ? request.getStatus() : "PENDING");
        Order saved = orderRepository.save(order);
        orderProducer.sendOrderEvent("Order created: " + saved.getId());
        return toResponse(saved);
    }
    public OrderResponseDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        return toResponse(order);
    }
    public OrderResponseDTO updateOrder(Long id, OrderRequestDTO request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        order.setCustomerId(request.getCustomerId());
        order.setProductName(request.getProductName());
        order.setPrice(request.getPrice());
        order.setQuantity(request.getQuantity());
		if (request.getStatus() != null) order.setStatus(request.getStatus());
        Order saved = orderRepository.save(order);
        return toResponse(saved);
    }
    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with ID: " + id);
        }
        orderRepository.deleteById(id);
    }
    private OrderResponseDTO toResponse(Order order) {
        OrderResponseDTO response = new OrderResponseDTO();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomerId());
        response.setProductName(order.getProductName());
        response.setPrice(order.getPrice());
        response.setQuantity(order.getQuantity());
        response.setDate(order.getDate());
		response.setStatus(order.getStatus());
        return response;
    }
}