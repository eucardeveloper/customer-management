package com.enesucar.auth_service.dto;

import com.enesucar.auth_service.entity.AuthAudit;

import java.time.LocalDateTime;
import java.util.List;

/** One audit row as the admin screen sees it, and a page of them (newest first). */
public record AuthAuditResponse(Long id, String action, String actor, String target, String details,
                                LocalDateTime createdAt) {

    public static AuthAuditResponse of(AuthAudit a) {
        return new AuthAuditResponse(a.getId(), a.getAction(), a.getActor(), a.getTarget(), a.getDetails(),
                a.getCreatedAt());
    }

    public record Page(List<AuthAuditResponse> items, int page, int size, long total) {
    }
}
