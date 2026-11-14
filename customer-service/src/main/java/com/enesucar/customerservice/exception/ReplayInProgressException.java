package com.enesucar.customerservice.exception;

/** A dead-letter replay is already running; the second request must wait for it. */
public class ReplayInProgressException extends RuntimeException {
    public ReplayInProgressException() {
        super("A replay of the dead-letter topic is already running");
    }
}
