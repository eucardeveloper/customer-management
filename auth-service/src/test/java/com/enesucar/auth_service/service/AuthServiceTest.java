package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.AuthResponse;
import com.enesucar.auth_service.dto.LoginRequest;
import com.enesucar.auth_service.dto.RegisterRequest;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.UserAlreadyExistsException;
import com.enesucar.auth_service.repository.UserRepository;
import com.enesucar.auth_service.security.JwtUtil;
import com.enesucar.auth_service.security.LoginAttemptLimiter;
import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import org.springframework.security.authentication.BadCredentialsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private LoginAttemptLimiter loginAttemptLimiter;

    @Mock
    private com.enesucar.auth_service.repository.RevokedTokenRepository revokedTokens;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@test.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@test.com")
                .password("encodedPassword")
                .role(Role.USER)
                .build();
    }

    @Test
    void register_shouldReturnAuthResponse_whenValidRequest() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtil.generateToken(eq("testuser"), eq("USER"), eq(0), any())).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getRole()).isEqualTo("USER");
        verify(userRepository).save(any(User.class));
    }

    /**
     * SECURITY REGRESSION TEST.
     *
     * Before this was fixed, RegisterRequest carried a client-supplied "role" field and
     * AuthService trusted it:
     *     .role("ADMIN".equalsIgnoreCase(request.getRole()) ? Role.ADMIN : Role.USER)
     * Because POST /api/auth/register is permitAll() at both the gateway and the service,
     * anyone on the internet could obtain a full ADMIN account with a single request.
     *
     * The field is gone and the role is now hardcoded. This test captures the invariant so
     * the hole cannot be reopened: whatever the caller sends, a self-registered user is USER.
     */
    @Test
    void register_shouldAlwaysCreateUserRole_andNeverAdmin() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtil.generateToken(eq("testuser"), eq("USER"), eq(0), any())).thenReturn("jwt-token");

        authService.register(registerRequest);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole())
                .as("public self-registration must never yield ADMIN")
                .isEqualTo(Role.USER);

        // The token must also be minted with USER, not an elevated claim.
        verify(jwtUtil).generateToken("testuser", "USER", 0);
        verify(jwtUtil, never()).generateToken(anyString(), eq("ADMIN"), anyInt(), any());
    }

    @Test
    void register_shouldThrowException_whenUsernameAlreadyExists() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("Username already taken");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_shouldThrowException_whenEmailAlreadyExists() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("Email already registered");

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_shouldReturnAuthResponse_whenValidCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(eq("testuser"), eq("USER"), eq(0), any())).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getRole()).isEqualTo("USER");
    }

    @Test
    void login_shouldThrowException_whenUserNotFound() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_shouldRecordFailureAndRethrow_whenCredentialsAreWrong() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);

        verify(loginAttemptLimiter).reserveAttempt("testuser");
        verify(loginAttemptLimiter, never()).reset(any());
    }

    @Test
    void login_shouldResetCounter_whenCredentialsAreValid() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(eq("testuser"), eq("USER"), eq(0), any())).thenReturn("jwt-token");

        authService.login(loginRequest);

        verify(loginAttemptLimiter).reset("testuser");
    }

    @Test
    void login_shouldNotTouchAuthentication_whenAccountIsLockedOut() {
        doThrow(new TooManyLoginAttemptsException(120)).when(loginAttemptLimiter).reserveAttempt("testuser");

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(TooManyLoginAttemptsException.class);

        verifyNoInteractions(authenticationManager);
    }

    @Test
    void login_shouldCountTheFailureAgainstTheClientAddress_whenCredentialsAreWrong() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest, "203.0.113.9"))
                .isInstanceOf(BadCredentialsException.class);

        verify(loginAttemptLimiter).recordFailureIp("203.0.113.9");
        verify(loginAttemptLimiter).reserveAttempt("testuser");
    }

    @Test
    void login_shouldNotTouchAuthentication_whenTheClientAddressIsLockedOut() {
        doThrow(new TooManyLoginAttemptsException(300)).when(loginAttemptLimiter).checkAllowedIp("203.0.113.9");

        assertThatThrownBy(() -> authService.login(loginRequest, "203.0.113.9"))
                .isInstanceOf(TooManyLoginAttemptsException.class);

        verifyNoInteractions(authenticationManager);
    }

    // ---- changePassword ----

    private com.enesucar.auth_service.dto.ChangePasswordRequest pwRequest(String current, String next) {
        var r = new com.enesucar.auth_service.dto.ChangePasswordRequest();
        r.setCurrentPassword(current);
        r.setNewPassword(next);
        return r;
    }

    @Test
    void changePassword_shouldStoreNewHash_whenCurrentPasswordMatches() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass123", user.getPassword())).thenReturn(true);
        when(passwordEncoder.matches("newPass456", user.getPassword())).thenReturn(false);
        when(passwordEncoder.encode("newPass456")).thenReturn("newHash");

        authService.changePassword("testuser", pwRequest("oldPass123", "newPass456"));

        assertThat(user.getPassword()).isEqualTo("newHash");
        assertThat(user.getTokenVersion()).isEqualTo(1); // older sessions are invalidated
        verify(userRepository).save(user);
        verify(loginAttemptLimiter).reset("pwchange:testuser");
    }

    @Test
    void changePassword_shouldReject_whenCurrentPasswordWrong() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", user.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword("testuser", pwRequest("wrong", "newPass456")))
                .isInstanceOf(com.enesucar.auth_service.exception.InvalidPasswordException.class);

        verify(loginAttemptLimiter).reserveAttempt("pwchange:testuser");
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_shouldReject_whenNewPasswordEqualsCurrent() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("samePass123", user.getPassword())).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword("testuser", pwRequest("samePass123", "samePass123")))
                .isInstanceOf(com.enesucar.auth_service.exception.InvalidPasswordException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_shouldBeBlocked_whenThrottled() {
        doThrow(new TooManyLoginAttemptsException(600)).when(loginAttemptLimiter).reserveAttempt("pwchange:testuser");

        assertThatThrownBy(() -> authService.changePassword("testuser", pwRequest("a", "newPass456")))
                .isInstanceOf(TooManyLoginAttemptsException.class);

        verify(userRepository, never()).findByUsername(any());
    }

    // ---- logout ----

    @Test
    void logout_shouldRevokeTheTokenUntilItExpires() {
        when(jwtUtil.isTokenValid("tok")).thenReturn(true);
        when(jwtUtil.extractTokenId("tok")).thenReturn("jti-1");
        when(jwtUtil.extractExpiration("tok")).thenReturn(new java.util.Date(System.currentTimeMillis() + 3_600_000));

        authService.logout("tok");

        var captor = ArgumentCaptor.forClass(com.enesucar.auth_service.entity.RevokedToken.class);
        verify(revokedTokens).save(captor.capture());
        assertThat(captor.getValue().getJti()).isEqualTo("jti-1");
        assertThat(captor.getValue().getExpiresAt()).isAfter(java.time.LocalDateTime.now());
    }

    @Test
    void logout_shouldIgnoreMissingOrInvalidTokens() {
        authService.logout(null);
        authService.logout("");
        when(jwtUtil.isTokenValid("garbage")).thenReturn(false);
        authService.logout("garbage");
        verifyNoInteractions(revokedTokens);
    }

    @Test
    void logout_shouldIgnoreTokensWithoutAnId() {
        when(jwtUtil.isTokenValid("old")).thenReturn(true);
        when(jwtUtil.extractTokenId("old")).thenReturn(null);
        authService.logout("old");
        verifyNoInteractions(revokedTokens);
    }
}
