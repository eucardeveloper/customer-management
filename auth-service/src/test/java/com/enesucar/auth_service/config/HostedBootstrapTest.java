package com.enesucar.auth_service.config;

import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HostedBootstrapTest {

    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);

    private User admin() {
        return User.builder().username("admin").password(encoder.encode("admin123"))
                .email("a@a.com").role(Role.ADMIN).tokenVersion(2).build();
    }

    @Test
    void doesNothingWhenNotConfigured() {
        new HostedBootstrap(users, encoder, "", false).run(null);
        verifyNoInteractions(users);
    }

    @Test
    void replacesTheAdminPasswordAndEndsOldSessions() {
        User admin = admin();
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));

        new HostedBootstrap(users, encoder, "a-long-hosted-password", false).run(null);

        assertThat(encoder.matches("a-long-hosted-password", admin.getPassword())).isTrue();
        assertThat(encoder.matches("admin123", admin.getPassword())).isFalse();
        assertThat(admin.getTokenVersion()).isEqualTo(3);
        verify(users).save(admin);
    }

    @Test
    void anUnchangedPasswordIsNotRewrittenOnEveryStart() {
        User admin = admin();
        admin.setPassword(encoder.encode("a-long-hosted-password"));
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));

        new HostedBootstrap(users, encoder, "a-long-hosted-password", false).run(null);

        verify(users, never()).save(any());
        assertThat(admin.getTokenVersion()).isEqualTo(2);
    }

    @Test
    void refusesAShortPassword() {
        assertThatThrownBy(() -> new HostedBootstrap(users, encoder, "short", false).run(null))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(users);
    }

    @Test
    void canRemoveTheSeededDemoUser() {
        User demo = User.builder().username("user1").password("x").email("u@u.com").role(Role.USER).build();
        when(users.findByUsername("user1")).thenReturn(Optional.of(demo));

        new HostedBootstrap(users, encoder, "", true).run(null);

        verify(users).delete(demo);
    }
}
