package com.enesucar.auth_service.config;

import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.UserRepository;
import com.enesucar.auth_service.service.AuthAuditService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class HostedBootstrapTest {

    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final AuthAuditService audit = mock(AuthAuditService.class);

    private User admin() {
        return User.builder().username("admin").password(encoder.encode("admin123"))
                .email("a@a.com").role(Role.ADMIN).tokenVersion(2).build();
    }

    @Test
    void doesNothingWhenNotConfigured() {
        new HostedBootstrap(users, encoder, audit, "", false).run(null);
        verifyNoInteractions(users);
    }

    @Test
    void replacesTheAdminPasswordAndEndsOldSessions() {
        User admin = admin();
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));

        new HostedBootstrap(users, encoder, audit, "a-long-hosted-password", false).run(null);

        assertThat(encoder.matches("a-long-hosted-password", admin.getPassword())).isTrue();
        assertThat(encoder.matches("admin123", admin.getPassword())).isFalse();
        assertThat(admin.getTokenVersion()).isEqualTo(3);
        verify(users).save(admin);
        verify(audit).record(eq(AuthAuditService.BOOTSTRAP_ADMIN_PASSWORD), eq("system"), eq("admin"), any());
    }

    @Test
    void anUnchangedPasswordIsNotRewrittenOnEveryStart() {
        User admin = admin();
        admin.setPassword(encoder.encode("a-long-hosted-password"));
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));

        new HostedBootstrap(users, encoder, audit, "a-long-hosted-password", false).run(null);

        verify(users, never()).save(any());
        verifyNoInteractions(audit);
        assertThat(admin.getTokenVersion()).isEqualTo(2);
    }

    @Test
    void refusesAShortPassword() {
        assertThatThrownBy(() -> new HostedBootstrap(users, encoder, audit, "short", false).run(null))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(users);
    }

    @Test
    void canRemoveTheSeededDemoUser() {
        User demo = User.builder().username("user1").password("x").email("u@u.com").role(Role.USER).build();
        when(users.findByUsername("user1")).thenReturn(Optional.of(demo));

        new HostedBootstrap(users, encoder, audit, "", true).run(null);

        verify(users).delete(demo);
        verify(audit).record(eq(AuthAuditService.BOOTSTRAP_DEMO_USER_REMOVED), eq("system"), eq("user1"), any());
    }
}
