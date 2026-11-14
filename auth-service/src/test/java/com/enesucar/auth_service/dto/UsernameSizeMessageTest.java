package com.enesucar.auth_service.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The UI translates the server's validation messages by their English text. A username of the wrong length used
 * to come back as the validator's own, locale-dependent text ("size must be between 3 and 50", or in Turkish
 * "boyut '3' ile '50' arasında olmalı") that names no field and cannot be translated.
 */
class UsernameSizeMessageTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private List<String> usernameMessages(Object dto) {
        return validator.validate(dto).stream()
                .filter(v -> v.getPropertyPath().toString().equals("username"))
                .map(v -> v.getMessage()).toList();
    }

    @Test
    void aTooShortUsernameInSignUpGetsTheFixedMessage() {
        RegisterRequest r = new RegisterRequest();
        r.setUsername("ab"); r.setEmail("a@example.com"); r.setPassword("longenough1");
        assertThat(usernameMessages(r)).containsExactly("Username must be 3-50 characters");
    }

    @Test
    void aTooLongUsernameWhenAnAdminAddsAnAccountGetsTheFixedMessage() {
        CreateUserRequest r = new CreateUserRequest();
        r.setUsername("u".repeat(51)); r.setEmail("a@example.com"); r.setPassword("longenough1"); r.setRole("USER");
        assertThat(usernameMessages(r)).containsExactly("Username must be 3-50 characters");
    }
}
