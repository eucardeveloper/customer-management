package com.enesucar.auth_service.controller;

import com.enesucar.auth_service.dto.AuthAuditResponse;
import com.enesucar.auth_service.entity.AuthAudit;
import com.enesucar.auth_service.repository.AuthAuditRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only view of the account audit trail. ADMIN only. */
@RestController
@RequestMapping("/api/users/audit")
public class AuthAuditController {

    static final int MAX_PAGE_SIZE = 100;

    private final AuthAuditRepository audits;

    public AuthAuditController(AuthAuditRepository audits) {
        this.audits = audits;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthAuditResponse.Page> list(@RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size,
                                                       @RequestParam(required = false) String target) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        org.springframework.data.domain.Page<AuthAudit> result = (target == null || target.isBlank())
                ? audits.findAllByOrderByIdDesc(pageable)
                : audits.findByTargetOrderByIdDesc(target.trim(), pageable);
        return ResponseEntity.ok(new AuthAuditResponse.Page(
                result.getContent().stream().map(AuthAuditResponse::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements()));
    }
}
