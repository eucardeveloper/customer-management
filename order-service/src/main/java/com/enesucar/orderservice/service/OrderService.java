package com.enesucar.orderservice.service;
import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.exception.UnknownCustomerException;
import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.kafka.OrderEvent;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import com.enesucar.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final OutboxEventRepository outbox;
    private final CustomerClient customerClient;
    private final TransactionTemplate tx;
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    public OrderService(OrderRepository orderRepository, OutboxEventRepository outbox, CustomerClient customerClient,
                        PlatformTransactionManager transactionManager) {
        this.orderRepository = orderRepository;
        this.outbox = outbox;
        this.customerClient = customerClient;
        this.tx = new TransactionTemplate(transactionManager);
    }
    /** Separate databases, so a service call instead of a foreign key. */
    private void requireCustomer(Long customerId) {
        if (!customerClient.exists(customerId)) {
            throw new UnknownCustomerException(customerId);
        }
    }
    /**
     * The check before saving is not enough: a customer can be deleted between the check and the commit,
     * and the two services share no transaction. So after the order is committed the customer is asked
     * about again. The customer-service claims a customer before it looks for orders, which means one of the
     * two sides always sees the other: either the delete finds this order and is refused, or this re-check
     * finds the customer gone and the order is undone. If the customer-service cannot be reached the order is
     * undone as well (fail closed).
     */
    private void confirmCustomerOrUndo(Long customerId, Runnable undo) {
        boolean stillThere;
        try {
            stillThere = customerClient.exists(customerId);
        } catch (RuntimeException e) {
            undo.run();
            throw e;
        }
        if (!stillThere) {
            undo.run();
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
    public OrderResponseDTO createOrder(OrderRequestDTO request) {
        requireCustomer(request.getCustomerId());
        Order saved = tx.execute(status -> {
            Order order = new Order();
            order.setCustomerId(request.getCustomerId());
            order.setProductName(request.getProductName());
            order.setPrice(request.getPrice());
            order.setQuantity(request.getQuantity());
            order.setDate(request.getDate() != null ? request.getDate() : LocalDateTime.now());
            order.setStatus(request.getStatus() != null ? request.getStatus() : "PENDING");
            Order persisted = orderRepository.save(order);
            // Written in the same transaction as the order: either both exist or neither does.
            outbox.save(new OutboxEvent("order-events", OrderEvent.created(persisted.getId()).toJson()));
            return persisted;
        });
        confirmCustomerOrUndo(saved.getCustomerId(), () -> undoCreate(saved.getId()));
        return toResponse(saved);
    }

    private void undoCreate(Long orderId) {
        tx.executeWithoutResult(status -> {
            orderRepository.deleteById(orderId);
            outbox.save(new OutboxEvent("order-events", OrderEvent.deleted(orderId).toJson()));
        });
        logger.warn("Order {} undone: its customer was deleted while the order was being created", orderId);
    }

    public OrderResponseDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        return toResponse(order);
    }
    public OrderResponseDTO updateOrder(Long id, OrderRequestDTO request) {
        Order current = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        Long previousCustomerId = current.getCustomerId();
        boolean customerChanged = !Objects.equals(previousCustomerId, request.getCustomerId());
        if (customerChanged) {
            requireCustomer(request.getCustomerId());
        }
        Order saved = tx.execute(status -> {
            current.setCustomerId(request.getCustomerId());
            current.setProductName(request.getProductName());
            current.setPrice(request.getPrice());
            current.setQuantity(request.getQuantity());
            if (request.getStatus() != null) current.setStatus(request.getStatus());
            Order persisted = orderRepository.save(current);
            outbox.save(new OutboxEvent("order-events", OrderEvent.updated(id).toJson()));
            return persisted;
        });
        if (customerChanged) {
            confirmCustomerOrUndo(saved.getCustomerId(), () -> undoReassign(id, previousCustomerId));
        }
        return toResponse(saved);
    }

    private void undoReassign(Long orderId, Long previousCustomerId) {
        tx.executeWithoutResult(status -> {
            orderRepository.findById(orderId).ifPresent(o -> {
                o.setCustomerId(previousCustomerId);
                orderRepository.save(o);
                outbox.save(new OutboxEvent("order-events", OrderEvent.updated(orderId).toJson()));
            });
        });
        logger.warn("Order {} moved back to customer {}: the new customer was deleted during the change", orderId, previousCustomerId);
    }

    @Transactional
    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with ID: " + id);
        }
        orderRepository.deleteById(id);
        outbox.save(new OutboxEvent("order-events", OrderEvent.deleted(id).toJson()));
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
