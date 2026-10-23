package com.enesucar.orderservice.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class OrderRequestDTO {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Product name must be at most 255 characters")
    private String productName;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    @Digits(integer = 9, fraction = 2, message = "Price allows at most 9 digits before and 2 after the decimal point")
    private BigDecimal price;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private LocalDateTime date;

    @Pattern(regexp = "^(PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED)$",
             message = "Status must be PENDING, PROCESSING, SHIPPED, DELIVERED or CANCELLED")
    private String status;
}