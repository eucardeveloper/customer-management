package com.enesucar.customerservice.exception;

/** The customer still has orders, so deleting them would leave orders pointing at nobody. */
public class CustomerHasOrdersException extends RuntimeException {
    public CustomerHasOrdersException(Long customerId) {
        super("Customer " + customerId + " still has orders; delete or reassign them first");
    }
}
