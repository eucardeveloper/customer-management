package com.enesucar.auth_service.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

/** Null is valid (presence is the job of @NotBlank). */
public class Utf8MaxBytesValidator implements ConstraintValidator<Utf8MaxBytes, String> {

    private int max;

    @Override
    public void initialize(Utf8MaxBytes constraint) {
        this.max = constraint.value();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || value.getBytes(StandardCharsets.UTF_8).length <= max;
    }
}
