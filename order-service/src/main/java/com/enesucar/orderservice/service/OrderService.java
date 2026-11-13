package com.enesucar.orderservice.service;
import com.enesucar.orderservice.client.CustomerClient;
import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.entity.Order;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.exception.StaleVersionException;
import com.enesucar.orderservice.exception.UnknownCustomerException;
import com.enesucar.orderservice.entity.OutboxEvent;
import com.enesucar.orderservice.kafka.OrderEvent;
import com.enesucar.orderservice.entity.OrderAudit;
import com.enesucar.orderservice.repository.OrderAuditRepository;
import com.enesucar.orderservice.repository.OutboxEventRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final OrderAuditRepository audits;
    private final CustomerClient customerClient;
    private final TransactionTemplate tx;
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    public OrderService(OrderRepository orderRepository, OutboxEventRepository outbox, OrderAuditRepository audits, CustomerClient customerClient,
                        PlatformTransactionManager transactionManager) {
        this.orderRepository = orderRepository;
        this.outbox = outbox;
        this.audits = audits;
        this.customerClient = customerClient;
        this.tx = new TransactionTemplate(transactionManager);
    }
    /**
     * Writes the audit row inside the caller's transaction, so an order change and its record exist together.
     * The actor is the signed-in user the gateway forwarded. That includes the undo rows (UNDO_CREATE,
     * UNDO_REASSIGN): they run on the same request thread, so they are recorded under the user whose request
     * was undone, and the details say why. "system" appears only when no user is signed in at all.
     */
    private void audit(Long orderId, String action, String oldStatus, String newStatus, String details) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actor = auth != null && auth.isAuthenticated() && auth.getName() != null ? auth.getName() : "system";
        audits.save(new OrderAudit(orderId, action, actor, oldStatus, newStatus, details));
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
            outbox.save(new OutboxEvent("order-events", OrderEvent.created(persisted.getId(), persisted.getCustomerId()).toJson()));
            audit(persisted.getId(), "CREATE", null, persisted.getStatus(),
                    "customer=" + persisted.getCustomerId() + ", product=" + persisted.getProductName()
                            + ", price=" + persisted.getPrice() + ", qty=" + persisted.getQuantity());
            return persisted;
        });
        confirmCustomerOrUndo(saved.getCustomerId(), () -> undoCreate(saved.getId(), saved.getCustomerId()));
        return toResponse(saved);
    }

    private void undoCreate(Long orderId, Long customerId) {
        tx.executeWithoutResult(status -> {
            orderRepository.deleteById(orderId);
            outbox.save(new OutboxEvent("order-events", OrderEvent.deleted(orderId, customerId).toJson()));
            audit(orderId, "UNDO_CREATE", null, null, "customer " + customerId + " was deleted while the order was being created");
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
        if (request.getVersion() != null && !request.getVersion().equals(current.getVersion())) {
            throw new StaleVersionException();
        }
        Long previousCustomerId = current.getCustomerId();
        boolean customerChanged = !Objects.equals(previousCustomerId, request.getCustomerId());
        if (customerChanged) {
            requireCustomer(request.getCustomerId());
        }
        String oldStatus = current.getStatus();
        String changes = describeChanges(current, request);
        Order saved = tx.execute(status -> {
            current.setCustomerId(request.getCustomerId());
            current.setProductName(request.getProductName());
            current.setPrice(request.getPrice());
            current.setQuantity(request.getQuantity());
            if (request.getStatus() != null) current.setStatus(request.getStatus());
            Order persisted = orderRepository.save(current);
            outbox.save(new OutboxEvent("order-events", OrderEvent.updated(id, persisted.getCustomerId()).toJson()));
            audit(id, "UPDATE", oldStatus, persisted.getStatus(), changes);
            return persisted;
        });
        if (customerChanged) {
            confirmCustomerOrUndo(saved.getCustomerId(), () -> undoReassign(id, previousCustomerId, saved.getCustomerId()));
        }
        return toResponse(saved);
    }

    /** Moves the order back only while it still points at the deleted customer; a later edit by someone else is left alone. */
    private void undoReassign(Long orderId, Long previousCustomerId, Long newCustomerId) {
        tx.executeWithoutResult(status -> {
            orderRepository.findById(orderId).filter(o -> Objects.equals(o.getCustomerId(), newCustomerId)).ifPresent(o -> {
                o.setCustomerId(previousCustomerId);
                orderRepository.save(o);
                outbox.save(new OutboxEvent("order-events", OrderEvent.updated(orderId, previousCustomerId).toJson()));
                audit(orderId, "UNDO_REASSIGN", o.getStatus(), o.getStatus(), "customer " + newCustomerId + " -> " + previousCustomerId + " (new customer was deleted)");
            });
        });
        logger.warn("Order {} moved back to customer {}: the new customer was deleted during the change", orderId, previousCustomerId);
    }

    @Transactional
    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        orderRepository.deleteById(id);
        outbox.save(new OutboxEvent("order-events", OrderEvent.deleted(id, order.getCustomerId()).toJson()));
        audit(id, "DELETE", order.getStatus(), null,
                "customer=" + order.getCustomerId() + ", product=" + order.getProductName()
                        + ", price=" + order.getPrice() + ", qty=" + order.getQuantity());
    }

    /** Only the fields that actually change, as "field old->new"; "no field changed" for a save that changes nothing. */
    private static String describeChanges(Order current, OrderRequestDTO request) {
        StringBuilder sb = new StringBuilder();
        appendChange(sb, "customer", current.getCustomerId(), request.getCustomerId());
        appendChange(sb, "product", current.getProductName(), request.getProductName());
        appendChange(sb, "price", current.getPrice(), request.getPrice());
        appendChange(sb, "qty", current.getQuantity(), request.getQuantity());
        if (request.getStatus() != null) {
            appendChange(sb, "status", current.getStatus(), request.getStatus());
        }
        return sb.length() == 0 ? "no field changed" : sb.toString();
    }

    private static void appendChange(StringBuilder sb, String field, Object before, Object after) {
        boolean same = before instanceof java.math.BigDecimal b && after instanceof java.math.BigDecimal a
                ? b.compareTo(a) == 0 : Objects.equals(before, after);
        if (!same) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(field).append(' ').append(before).append("->").append(after);
        }
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
        response.setVersion(order.getVersion());
        return response;
    }
}
