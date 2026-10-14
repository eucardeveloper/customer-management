package com.enesucar.orderservice.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OrderRequestDTOValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private OrderRequestDTO valid(String status) {
        OrderRequestDTO dto = new OrderRequestDTO();
        dto.setCustomerId(1L);
        dto.setProductName("Laptop");
        dto.setPrice(new BigDecimal("10.00"));
        dto.setQuantity(1);
        dto.setStatus(status);
        return dto;
    }

    @Test
    void everyKnownStatusAndNoStatusAreAccepted() {
        for (String s : new String[]{"PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", null}) {
            assertThat(validator.validate(valid(s))).as(String.valueOf(s)).isEmpty();
        }
    }

    @Test
    void anUnknownStatusIsRejected() {
        assertThat(validator.validate(valid("REFUNDED_MAYBE"))).hasSize(1);
        assertThat(validator.validate(valid("delivered"))).hasSize(1);
    }
}
