package com.enesucar.orderservice.dto;

import com.enesucar.orderservice.entity.OrderAudit;

import java.time.LocalDateTime;

/** One audit row as the admin screen sees it. */
public record OrderAuditResponseDTO(Long id, Long orderId, String action, String actor,
                                    String oldStatus, String newStatus, String details, LocalDateTime createdAt) {

    public static OrderAuditResponseDTO of(OrderAudit a) {
        return new OrderAuditResponseDTO(a.getId(), a.getOrderId(), a.getAction(), a.getActor(),
                a.getOldStatus(), a.getNewStatus(), a.getDetails(), a.getCreatedAt());
    }
}
