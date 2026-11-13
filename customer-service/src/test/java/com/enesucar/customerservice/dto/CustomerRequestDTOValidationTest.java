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

    @Test
    void anEmailLongerThanTheColumnIsRejectedAsInvalidInput() {
        CustomerRequestDTO dto = withType("INDIVIDUAL");
        // Well-formed for @Email (local part <= 64, each label <= 63) yet 308 characters; the column holds 255.
        dto.setEmail("a".repeat(60) + "@" + ("b".repeat(60) + ".").repeat(4) + "com");
        assertThat(validator.validate(dto)).extracting(v -> v.getPropertyPath().toString()).contains("email");
    }
}
