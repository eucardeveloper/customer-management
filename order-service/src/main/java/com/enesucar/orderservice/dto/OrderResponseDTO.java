package com.enesucar.orderservice.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.enesucar.orderservice.config.BigDecimalSerializer;
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

    @JsonSerialize(using = BigDecimalSerializer.class)
    private BigDecimal price;

    private Integer quantity;

    private LocalDateTime date;
	
	private String status;
}
