package com.enesucar.orderservice.dto;

import java.util.List;

/** A page of audit rows, newest first; {@code total} is the number of rows over all pages. */
public record OrderAuditPageDTO(List<OrderAuditResponseDTO> items, int page, int size, long total) {
}
