package com.enesucar.customerservice.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** E-posta ve telefon ikisi de boşsa API kaydı kabul etmez (yalnız arayüz değil). */
class CustomerContactRequiredTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CustomerRequestDTO dto(String email, String phone) {
        CustomerRequestDTO d = new CustomerRequestDTO();
        d.setFirstName("Ayse");
        d.setEmail(email);
        d.setPhone(phone);
        return d;
    }

    @Test
    void neitherEmailNorPhoneIsInvalid() {
        assertThat(validator.validate(dto(null, null))).isNotEmpty();
        assertThat(validator.validate(dto("", "  "))).isNotEmpty();
    }

    @Test
    void emailOnlyOrPhoneOnlyIsValid() {
        assertThat(validator.validate(dto("a@b.com", null))).isEmpty();
        assertThat(validator.validate(dto(null, "+90 555 000 0000"))).isEmpty();
    }
}
