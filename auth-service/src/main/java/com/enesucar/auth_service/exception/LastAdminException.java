package com.enesucar.auth_service.exception;

/** The only remaining ADMIN cannot be demoted or deleted: nobody would be left to manage users. */
public class LastAdminException extends RuntimeException {
    public LastAdminException() {
        super("The last administrator cannot be demoted or deleted");
    }
}
