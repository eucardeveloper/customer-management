package com.enesucar.orderservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderRequestDTO {

    @NotNull
    private Long customerId;

    @NotBlank
    private String product;

    @NotNull
    @Min(1)
    private Integer quantity;

    @NotNull
    private Double price;
}
