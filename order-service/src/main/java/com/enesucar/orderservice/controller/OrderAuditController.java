package com.enesucar.orderservice.controller;

import com.enesucar.orderservice.dto.OrderAuditPageDTO;
import com.enesucar.orderservice.dto.OrderAuditResponseDTO;
import com.enesucar.orderservice.entity.OrderAudit;
import com.enesucar.orderservice.repository.OrderAuditRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import com.enesucar.orderservice.exception.InvalidFilterException;
import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only view of the order audit trail. ADMIN only (enforced in SecurityConfig). */
@RestController
@RequestMapping("/api/orders/audit")
public class OrderAuditController {

    static final int MAX_PAGE_SIZE = 100;

    private final OrderAuditRepository audits;

    public OrderAuditController(OrderAuditRepository audits) {
        this.audits = audits;
    }

    /**
     * Newest first. All filters are optional and combine with AND: orderId and action match exactly, actor is a
     * case-insensitive "contains", from/to are inclusive whole days.
     */
    @GetMapping
    public ResponseEntity<OrderAuditPageDTO> list(@RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size,
                                                  @RequestParam(required = false) Long orderId,
                                                  @RequestParam(required = false) String action,
                                                  @RequestParam(required = false) String actor,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new InvalidFilterException("'to' must not be before 'from'");
        }
        // A bad paging request is clamped instead of rejected, and the page size has a ceiling.
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "id"));
        Specification<OrderAudit> spec = (root, query, cb) -> cb.conjunction();
        if (orderId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orderId"), orderId));
        }
        if (action != null && !action.isBlank()) {
            String wanted = action.trim().toUpperCase(java.util.Locale.ROOT);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), wanted));
        }
        if (actor != null && !actor.isBlank()) {
            String needle = "%" + escapeLike(actor.trim().toLowerCase(java.util.Locale.ROOT)) + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.<String>get("actor")), needle, '\\'));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.<java.time.LocalDateTime>get("createdAt"), from.atStartOfDay()));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThan(root.<java.time.LocalDateTime>get("createdAt"), to.plusDays(1).atStartOfDay()));
        }
        Page<OrderAudit> result = audits.findAll(spec, pageable);
        return ResponseEntity.ok(new OrderAuditPageDTO(
                result.getContent().stream().map(OrderAuditResponseDTO::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements()));
    }

    /** Typing % or _ in the actor box must search for those characters, not act as wildcards. */
    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
