package com.enesucar.customerservice.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CustomerRequestDTOValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CustomerRequestDTO withType(String type) {
        CustomerRequestDTO dto = new CustomerRequestDTO();
        dto.setFirstName("Ada");
        dto.setEmail("ada@example.com");   // iletişim bilgisi zorunlu (CustomerContactRequiredTest)
        dto.setCustomerType(type);
        return dto;
    }

    @Test
    void individualCompanyAndNoTypeAreAccepted() {
        for (String t : new String[]{"INDIVIDUAL", "COMPANY", null}) {
            assertThat(validator.validate(withType(t))).as(String.valueOf(t)).isEmpty();
        }
    }

    @Test
    void anUnknownTypeIsRejected() {
        assertThat(validator.validate(withType("VIP"))).hasSize(1);
    }
}
