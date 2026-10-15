package com.enesucar.customerservice.exception;

/** Another delete of the same customer is already checking for orders. */
public class DeletionInProgressException extends RuntimeException {
    public DeletionInProgressException(Long customerId) {
        super("Customer " + customerId + " is already being deleted; try again shortly");
    }
}
