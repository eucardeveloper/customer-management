package com.enesucar.orderservice.exception;

/** The customer-service could not be asked, so the order is refused rather than stored unchecked. */
public class CustomerServiceUnavailableException extends RuntimeException {
    public CustomerServiceUnavailableException(Throwable cause) {
        super("Customer service unavailable", cause);
    }
}
