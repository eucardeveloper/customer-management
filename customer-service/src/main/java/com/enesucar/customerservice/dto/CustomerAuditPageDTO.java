package com.enesucar.customerservice.dto;

import java.util.List;

/** A page of audit rows, newest first; {@code total} is the number of rows over all pages. */
public record CustomerAuditPageDTO(List<CustomerAuditResponseDTO> items, int page, int size, long total) {
}
