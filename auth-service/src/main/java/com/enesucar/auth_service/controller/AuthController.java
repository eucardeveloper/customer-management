package com.enesucar.auth_service.controller;

import com.enesucar.auth_service.dto.AuthResponse;
import com.enesucar.auth_service.dto.ChangePasswordRequest;
import com.enesucar.auth_service.dto.LoginRequest;
import com.enesucar.auth_service.dto.RegisterRequest;
import com.enesucar.auth_service.dto.SessionResponse;
import com.enesucar.auth_service.security.AuthCookies;
import com.enesucar.auth_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    @PostMapping("/register")
    public ResponseEntity<SessionResponse> register(@RequestBody @Valid RegisterRequest request) {
        return session(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<SessionResponse> login(@RequestBody @Valid LoginRequest request) {
        return session(authService.login(request));
    }

    /** Ends the browser session by expiring the cookie. Safe to call without being signed in. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookies.clear().toString())
                .build();
    }

    /**
     * Who am I. The gateway calls this to confirm a token is still valid (not revoked by a password
     * or role change); the browser may use it to restore its session.
     */
    @GetMapping("/session")
    public ResponseEntity<SessionResponse> currentSession(Authentication authentication) {
        String role = authentication.getAuthorities().iterator().next().getAuthority().replaceFirst("^ROLE_", "");
        return ResponseEntity.ok(new SessionResponse(authentication.getName(), role));
    }

    /** Change the signed-in user's own password. */
    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                               @RequestBody @Valid ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<SessionResponse> session(AuthResponse auth) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookies.issue(auth.getToken()).toString())
                .body(new SessionResponse(auth.getUsername(), auth.getRole()));
    }
}
