package com.enesucar.orderservice.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class OrderResponseDTO {

    private Long id;

    private Long customerId;

    private String productName;

    private BigDecimal price;

    private Integer quantity;

    private LocalDateTime date;
}
