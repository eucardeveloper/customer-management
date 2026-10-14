package com.enesucar.auth_service.exception;

/** Public sign-up is switched off (the default); accounts are then created by an administrator. */
public class RegistrationDisabledException extends RuntimeException {

    public RegistrationDisabledException() {
        super("Self-registration is disabled");
    }
}
