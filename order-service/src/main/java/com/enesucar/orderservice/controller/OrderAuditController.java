package com.enesucar.orderservice.controller;

import com.enesucar.orderservice.dto.OrderAuditPageDTO;
import com.enesucar.orderservice.dto.OrderAuditResponseDTO;
import com.enesucar.orderservice.entity.OrderAudit;
import com.enesucar.orderservice.repository.OrderAuditRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    @GetMapping
    public ResponseEntity<OrderAuditPageDTO> list(@RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size,
                                                  @RequestParam(required = false) Long orderId) {
        // A bad paging request is clamped instead of rejected, and the page size has a ceiling.
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<OrderAudit> result = orderId == null
                ? audits.findAllByOrderByIdDesc(pageable)
                : audits.findByOrderIdOrderByIdDesc(orderId, pageable);
        return ResponseEntity.ok(new OrderAuditPageDTO(
                result.getContent().stream().map(OrderAuditResponseDTO::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements()));
    }
}
