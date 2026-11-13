package com.enesucar.orderservice.exception;

/** The caller edited an older copy of the order than the one stored now (optimistic locking). */
public class StaleVersionException extends RuntimeException {
    public StaleVersionException() {
        super("The order was changed by someone else; reload it and try again");
    }
}
