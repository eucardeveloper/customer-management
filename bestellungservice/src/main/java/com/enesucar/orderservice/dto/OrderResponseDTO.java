package com.enesucar.orderservice.dto;

import lombok.Data;

@Data
public class OrderResponseDTO {

    private Long id;
    private Long customerId;
    private String product;
    private Integer quantity;
    private Double price;
}
