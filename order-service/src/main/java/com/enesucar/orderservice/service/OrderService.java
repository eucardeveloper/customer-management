package com.enesucar.orderservice.service;
import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.exception.UnknownCustomerException;
import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.springframework.transaction.annotation.Transactional;
import com.enesucar.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final OutboxEventRepository outbox;
    private final CustomerClient customerClient;
    public OrderService(OrderRepository orderRepository, OutboxEventRepository outbox, CustomerClient customerClient) {
        this.orderRepository = orderRepository;
        this.outbox = outbox;
        this.customerClient = customerClient;
    }
    /** Separate databases, so a service call instead of a foreign key. */
    private void requireCustomer(Long customerId) {
        if (!customerClient.exists(customerId)) {
            throw new UnknownCustomerException(customerId);
        }
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
    @Transactional
    public OrderResponseDTO createOrder(OrderRequestDTO request) {
        requireCustomer(request.getCustomerId());
        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setProductName(request.getProductName());
        order.setPrice(request.getPrice());
        order.setQuantity(request.getQuantity());
        order.setDate(request.getDate() != null ? request.getDate() : LocalDateTime.now());		order.setStatus(request.getStatus() != null ? request.getStatus() : "PENDING");
        Order saved = orderRepository.save(order);
        // Written in the same transaction as the order: either both exist or neither does.
        outbox.save(new OutboxEvent("order-events", "Order created: " + saved.getId()));
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
        if (!java.util.Objects.equals(order.getCustomerId(), request.getCustomerId())) {
            requireCustomer(request.getCustomerId());
        }
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
