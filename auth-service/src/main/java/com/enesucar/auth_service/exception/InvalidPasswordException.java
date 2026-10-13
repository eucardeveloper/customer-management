package com.enesucar.auth_service.exception;

/** The current password was wrong, or the new one is not acceptable. Maps to HTTP 400. */
public class InvalidPasswordException extends RuntimeException {
    public InvalidPasswordException(String message) {
        super(message);
    }
}
