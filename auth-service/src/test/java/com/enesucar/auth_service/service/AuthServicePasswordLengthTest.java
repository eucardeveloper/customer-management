package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.ChangePasswordRequest;
import com.enesucar.auth_service.dto.LoginRequest;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.InvalidPasswordException;
import com.enesucar.auth_service.repository.RevokedTokenRepository;
import com.enesucar.auth_service.repository.UserRepository;
import com.enesucar.auth_service.security.JwtUtil;
import com.enesucar.auth_service.security.LoginAttemptLimiter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** A password BCrypt cannot even look at is a wrong password (401 / 400), never a 500. */
@ExtendWith(MockitoExtension.class)
class AuthServicePasswordLengthTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private LoginAttemptLimiter loginAttemptLimiter;
    @Mock private RevokedTokenRepository revokedTokens;
    @Mock private AuthAuditService audit;
    @InjectMocks private AuthService authService;

    private static final String TOO_LONG = "ş".repeat(40);   // 80 bytes

    @Test
    void loginWithAnOverlongPasswordIsABadLoginNotAServerError() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword(TOO_LONG);

        assertThatThrownBy(() -> authService.login(request, "10.0.0.1")).isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(authenticationManager);
        verify(audit).record(AuthAuditService.LOGIN_FAILED, "testuser", "testuser", "bad credentials");
    }

    @Test
    void changePasswordWithAnOverlongCurrentPasswordIsRejectedAsIncorrect() {
        User user = User.builder().id(1L).username("testuser").email("t@t.com").password("hash").role(Role.USER).build();
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(TOO_LONG);
        request.setNewPassword("a-perfectly-fine-new-password");

        assertThatThrownBy(() -> authService.changePassword("testuser", request))
                .isInstanceOf(InvalidPasswordException.class);

        verify(passwordEncoder, never()).matches(any(), any());
    }
}
