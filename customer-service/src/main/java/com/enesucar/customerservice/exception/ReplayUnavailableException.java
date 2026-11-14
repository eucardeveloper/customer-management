package com.enesucar.customerservice.exception;

/** The broker could not be read or written during a dead-letter replay. Events not yet confirmed stay on the dead-letter topic. */
public class ReplayUnavailableException extends RuntimeException {
    public ReplayUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
