package com.enesucar.auth_service.exception;

/** A list filter that makes no sense (for example a date range that ends before it starts): the client's mistake, so 400. */
public class InvalidFilterException extends RuntimeException {
    public InvalidFilterException(String message) {
        super(message);
    }
}
