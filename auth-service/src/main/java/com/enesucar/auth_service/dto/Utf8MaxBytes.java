package com.enesucar.auth_service.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The text may be at most {@code value} bytes in UTF-8. {@code @Size} counts characters, but BCrypt counts
 * bytes (72 at most) and "ş", "ğ", "ı" take two, so a 40-letter Turkish password can already be too long.
 */
@Documented
@Constraint(validatedBy = Utf8MaxBytesValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface Utf8MaxBytes {

    int value() default 72;

    String message() default "Password must be at most 72 bytes (accented letters count as 2)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
