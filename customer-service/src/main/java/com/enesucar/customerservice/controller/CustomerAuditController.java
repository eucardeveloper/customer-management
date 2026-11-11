package com.enesucar.customerservice.controller;

import com.enesucar.customerservice.dto.CustomerAuditPageDTO;
import com.enesucar.customerservice.dto.CustomerAuditResponseDTO;
import com.enesucar.customerservice.entity.CustomerAudit;
import com.enesucar.customerservice.repository.CustomerAuditRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    @GetMapping
    public ResponseEntity<CustomerAuditPageDTO> list(@RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size,
                                                     @RequestParam(required = false) Long customerId) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<CustomerAudit> result = customerId == null
                ? audits.findAllByOrderByIdDesc(pageable)
                : audits.findByCustomerIdOrderByIdDesc(customerId, pageable);
        return ResponseEntity.ok(new CustomerAuditPageDTO(
                result.getContent().stream().map(CustomerAuditResponseDTO::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements()));
    }
}
