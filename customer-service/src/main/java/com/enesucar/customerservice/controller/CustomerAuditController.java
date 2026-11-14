package com.enesucar.customerservice.controller;

import com.enesucar.customerservice.dto.CustomerAuditPageDTO;
import com.enesucar.customerservice.dto.CustomerAuditResponseDTO;
import com.enesucar.customerservice.entity.CustomerAudit;
import com.enesucar.customerservice.repository.CustomerAuditRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import com.enesucar.customerservice.exception.InvalidFilterException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only view of the customer audit trail. ADMIN only (enforced in SecurityConfig). */
@RestController
@RequestMapping("/api/customers/audit")
public class CustomerAuditController {

    static final int MAX_PAGE_SIZE = 100;

    private final CustomerAuditRepository audits;

    public CustomerAuditController(CustomerAuditRepository audits) {
        this.audits = audits;
    }

    /**
     * Newest first. All filters are optional and combine with AND: customerId and action match exactly, actor is a
     * case-insensitive "contains", from/to are inclusive whole days.
     */
    @GetMapping
    public ResponseEntity<CustomerAuditPageDTO> list(@RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size,
                                                     @RequestParam(required = false) Long customerId,
                                                     @RequestParam(required = false) String action,
                                                     @RequestParam(required = false) String actor,
                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new InvalidFilterException("'to' must not be before 'from'");
        }
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "id"));
        Specification<CustomerAudit> spec = (root, query, cb) -> cb.conjunction();
        if (customerId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("customerId"), customerId));
        }
        if (action != null && !action.isBlank()) {
            String wanted = action.trim().toUpperCase(Locale.ROOT);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), wanted));
        }
        if (actor != null && !actor.isBlank()) {
            String needle = "%" + escapeLike(actor.trim().toLowerCase(Locale.ROOT)) + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.<String>get("actor")), needle, '\\'));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), from.atStartOfDay()));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThan(root.<LocalDateTime>get("createdAt"), to.plusDays(1).atStartOfDay()));
        }
        Page<CustomerAudit> result = audits.findAll(spec, pageable);
        return ResponseEntity.ok(new CustomerAuditPageDTO(
                result.getContent().stream().map(CustomerAuditResponseDTO::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements()));
    }

    /** Typing % or _ in the actor box must search for those characters, not act as wildcards. */
    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
