package com.enesucar.customerservice.exception;

/** The caller edited an older copy of the record than the one stored now (optimistic locking). */
public class StaleVersionException extends RuntimeException {
    public StaleVersionException() {
        super("The customer was changed by someone else; reload it and try again");
    }
}
