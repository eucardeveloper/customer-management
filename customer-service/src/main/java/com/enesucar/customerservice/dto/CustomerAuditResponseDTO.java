package com.enesucar.customerservice.dto;

import com.enesucar.customerservice.entity.CustomerAudit;

import java.time.LocalDateTime;

/** One audit row as the admin screen sees it. */
public record CustomerAuditResponseDTO(Long id, Long customerId, String action, String actor,
                                       String details, LocalDateTime createdAt) {

    public static CustomerAuditResponseDTO of(CustomerAudit a) {
        return new CustomerAuditResponseDTO(a.getId(), a.getCustomerId(), a.getAction(), a.getActor(),
                a.getDetails(), a.getCreatedAt());
    }
}
