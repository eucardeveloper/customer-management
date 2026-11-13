package com.enesucar.auth_service.exception;

/** An administrator tried to delete the account they are signed in with. */
public class SelfDeletionException extends RuntimeException {
    public SelfDeletionException() {
        super("You cannot delete your own account; ask another administrator");
    }
}
