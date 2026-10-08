package com.enesucar.auth_service.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Builds the session cookie. The token is HttpOnly (JavaScript cannot read it, so an XSS bug cannot
 * steal it) and SameSite=Strict (the browser does not attach it to requests started by other sites).
 */
@Component
public class AuthCookies {

    public static final String NAME = "access_token";

    private final long maxAgeMillis;
    private final boolean secure;

    public AuthCookies(@Value("${jwt.expiration}") long maxAgeMillis,
                       @Value("${auth.cookie.secure:true}") boolean secure) {
        this.maxAgeMillis = maxAgeMillis;
        this.secure = secure;
    }

    public ResponseCookie issue(String token) {
        return base(token).maxAge(Duration.ofMillis(maxAgeMillis)).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/");
    }
}
