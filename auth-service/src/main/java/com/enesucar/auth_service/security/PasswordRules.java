package com.enesucar.auth_service.security;

import java.nio.charset.StandardCharsets;

/** BCrypt looks at 72 bytes at most and refuses longer input; such a password can never be a stored one. */
public final class PasswordRules {

    public static final int BCRYPT_MAX_BYTES = 72;

    private PasswordRules() {
    }

    public static boolean exceedsBcryptLimit(String password) {
        return password != null && password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
    }
}
