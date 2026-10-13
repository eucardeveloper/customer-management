package com.enesucar.customerservice.exception;

/** The order-service could not be asked, so the safe answer is to refuse the change. */
public class OrderServiceUnavailableException extends RuntimeException {
    public OrderServiceUnavailableException(Throwable cause) {
        super("Order service unavailable", cause);
    }
}
