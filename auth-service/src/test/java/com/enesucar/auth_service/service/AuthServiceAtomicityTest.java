package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.ChangePasswordRequest;
import com.enesucar.auth_service.dto.RegisterRequest;
import com.enesucar.auth_service.entity.AuthAudit;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.InvalidPasswordException;
import com.enesucar.auth_service.repository.AuthAuditRepository;
import com.enesucar.auth_service.repository.LoginFailureRepository;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;

/**
 * An account change and its audit row are written together or not at all, and a refused password change is
 * audited too. Runs the real services and database layer (H2); only the audit writer is made to fail.
 */
@SpringBootTest
class AuthServiceAtomicityTest {

    @Autowired AuthService authService;
    @Autowired UserRepository users;
    @Autowired AuthAuditRepository audits;
    @Autowired LoginFailureRepository loginFailures;
    @Autowired PasswordEncoder encoder;
    @MockitoSpyBean AuthAuditService audit;

    @AfterEach
    void leaveNoLoginFailuresBehind() {
        loginFailures.deleteAll();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private User savedUser(String name, String password) {
        return users.save(User.builder().username(name).email(name + "@example.com")
                .password(encoder.encode(password)).role(Role.USER).build());
    }

    @Test
    void registerLeavesNoAccountBehindWhenItsAuditRowCannotBeWritten() {
        String name = "reg" + shortId();
        doThrow(new IllegalStateException("audit store down"))
                .when(audit).record(eq(AuthAuditService.USER_REGISTERED), any(), any(), any());
        RegisterRequest request = new RegisterRequest();
        request.setUsername(name);
        request.setEmail(name + "@example.com");
        request.setPassword("a-long-enough-password");

        assertThatThrownBy(() -> authService.register(request)).isInstanceOf(IllegalStateException.class);

        assertThat(users.findByUsername(name)).isEmpty();
    }

    @Test
    void changePasswordKeepsTheOldPasswordWhenItsAuditRowCannotBeWritten() {
        String name = "chg" + shortId();
        String oldPassword = "Old-" + UUID.randomUUID();
        User before = savedUser(name, oldPassword);
        doThrow(new IllegalStateException("audit store down"))
                .when(audit).record(eq(AuthAuditService.PASSWORD_CHANGED), any(), any(), any());
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(oldPassword);
        request.setNewPassword("New-" + UUID.randomUUID());

        assertThatThrownBy(() -> authService.changePassword(name, request)).isInstanceOf(IllegalStateException.class);

        User after = users.findByUsername(name).orElseThrow();
        assertThat(encoder.matches(oldPassword, after.getPassword())).isTrue();
        assertThat(after.getTokenVersion()).isEqualTo(before.getTokenVersion());
    }

    @Test
    void aWrongCurrentPasswordIsAudited() {
        String name = "bad" + shortId();
        savedUser(name, "Right-" + UUID.randomUUID());
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("Wrong-" + UUID.randomUUID());
        request.setNewPassword("New-" + UUID.randomUUID());

        assertThatThrownBy(() -> authService.changePassword(name, request)).isInstanceOf(InvalidPasswordException.class);

        List<AuthAudit> trail = audits.findByTargetOrderByIdDesc(name, PageRequest.of(0, 20)).getContent();
        assertThat(trail).extracting(AuthAudit::getAction).contains("PASSWORD_CHANGE_FAILED");
        assertThat(trail).allSatisfy(a -> assertThat(String.valueOf(a.getDetails())).doesNotContain("Wrong-"));
    }

    @Test
    void aReservedThrottleAttemptStaysCountedWhenTheRequestFailsLater() {
        String name = "thr" + shortId();
        savedUser(name, "Right-" + UUID.randomUUID());
        doThrow(new IllegalStateException("audit store down"))
                .when(audit).record(eq(AuthAuditService.PASSWORD_CHANGE_FAILED), any(), any(), any());
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("Wrong-" + UUID.randomUUID());
        request.setNewPassword("New-" + UUID.randomUUID());

        assertThatThrownBy(() -> authService.changePassword(name, request)).isInstanceOf(IllegalStateException.class);

        // The attempt was reserved before the failure; rolling back the request must not erase it, or a
        // guesser could make every attempt vanish (and parallel attempts could not see each other).
        assertThat(loginFailures.findByThrottleKeyAndAttemptedAtAfterOrderByAttemptedAtAsc(
                "pwchange:" + name, LocalDateTime.of(2000, 1, 1, 0, 0))).hasSize(1);
    }
}
