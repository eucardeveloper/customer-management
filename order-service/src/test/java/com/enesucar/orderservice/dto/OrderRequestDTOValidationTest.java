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
    void aPriceThatDoesNotFitTheColumnIsRejectedInsteadOfFailingInTheDatabase() {
        OrderRequestDTO huge = valid(null);
        huge.setPrice(new BigDecimal("1e20"));
        assertThat(validator.validate(huge)).hasSize(1);

        OrderRequestDTO tooPrecise = valid(null);
        tooPrecise.setPrice(new BigDecimal("10.123"));
        assertThat(validator.validate(tooPrecise)).hasSize(1);

        OrderRequestDTO biggestAllowed = valid(null);
        biggestAllowed.setPrice(new BigDecimal("999999999.99"));
        assertThat(validator.validate(biggestAllowed)).isEmpty();
    }

    @Test
    void aProductNameLongerThanTheColumnIsRejected() {
        OrderRequestDTO tooLong = valid(null);
        tooLong.setProductName("x".repeat(256));
        assertThat(validator.validate(tooLong)).hasSize(1);

        OrderRequestDTO longest = valid(null);
        longest.setProductName("x".repeat(255));
        assertThat(validator.validate(longest)).isEmpty();
    }

    @Test
    void anUnknownStatusIsRejected() {
        assertThat(validator.validate(valid("REFUNDED_MAYBE"))).hasSize(1);
        assertThat(validator.validate(valid("delivered"))).hasSize(1);
    }
}
