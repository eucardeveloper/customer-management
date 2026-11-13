package com.enesucar.auth_service.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BCrypt refuses a password of more than 72 BYTES, and "ş", "ğ", "ı" take two. Every endpoint that
 * accepts a new password has to count bytes, otherwise a long (or accented) password becomes a 500.
 */
class PasswordByteLengthValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static final String ASCII_80 = "a".repeat(80);
    private static final String TWO_BYTE_40 = "ş".repeat(40);   // 40 characters, 80 bytes
    private static final String TWO_BYTE_36 = "ş".repeat(36);   // 72 bytes: still fine
    private static final String ASCII_72 = "a".repeat(72);

    private boolean rejects(Object dto, String property) {
        return validator.validate(dto).stream().anyMatch(v -> v.getPropertyPath().toString().equals(property));
    }

    private RegisterRequest register(String password) {
        RegisterRequest r = new RegisterRequest();
        r.setUsername("someone");
        r.setEmail("someone@example.com");
        r.setPassword(password);
        return r;
    }

    private CreateUserRequest create(String password) {
        CreateUserRequest r = new CreateUserRequest();
        r.setUsername("someone");
        r.setEmail("someone@example.com");
        r.setRole("USER");
        r.setPassword(password);
        return r;
    }

    private ResetPasswordRequest reset(String password) {
        ResetPasswordRequest r = new ResetPasswordRequest();
        r.setNewPassword(password);
        return r;
    }

    private ChangePasswordRequest change(String password) {
        ChangePasswordRequest r = new ChangePasswordRequest();
        r.setCurrentPassword("whatever-current");
        r.setNewPassword(password);
        return r;
    }

    @Test
    void registerRejectsMoreThan72Bytes() {
        assertThat(rejects(register(ASCII_80), "password")).isTrue();
        assertThat(rejects(register(TWO_BYTE_40), "password")).isTrue();
        assertThat(rejects(register(ASCII_72), "password")).isFalse();
        assertThat(rejects(register(TWO_BYTE_36), "password")).isFalse();
    }

    @Test
    void adminCreateRejectsMoreThan72Bytes() {
        assertThat(rejects(create(TWO_BYTE_40), "password")).isTrue();
        assertThat(rejects(create(TWO_BYTE_36), "password")).isFalse();
    }

    @Test
    void resetRejectsMoreThan72Bytes() {
        assertThat(rejects(reset(TWO_BYTE_40), "newPassword")).isTrue();
        assertThat(rejects(reset(TWO_BYTE_36), "newPassword")).isFalse();
    }

    @Test
    void changeRejectsMoreThan72Bytes() {
        assertThat(rejects(change(TWO_BYTE_40), "newPassword")).isTrue();
        assertThat(rejects(change(TWO_BYTE_36), "newPassword")).isFalse();
    }
}
