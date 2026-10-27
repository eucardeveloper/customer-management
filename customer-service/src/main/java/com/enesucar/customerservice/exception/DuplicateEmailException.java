package com.enesucar.customerservice.exception;

/** Another customer already uses this e-mail address. */
public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("Email already registered: " + email);
    }
}
