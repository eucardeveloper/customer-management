package com.enesucar.auth_service.exception;

/** The requested role is missing or is not one of the known roles. A client mistake, so it answers 400. */
public class InvalidRoleException extends RuntimeException {
    public InvalidRoleException(String message) {
        super(message);
    }
}
