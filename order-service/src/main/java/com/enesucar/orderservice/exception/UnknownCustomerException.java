package com.enesucar.orderservice.exception;

/** An order must belong to a customer that exists. */
public class UnknownCustomerException extends RuntimeException {
    public UnknownCustomerException(Long customerId) {
        super("Customer " + customerId + " does not exist");
    }
}
