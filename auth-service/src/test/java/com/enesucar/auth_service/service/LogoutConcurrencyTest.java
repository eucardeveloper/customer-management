package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.LoginRequest;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Two logouts of the same session sent at the very same instant must both succeed (the session is ended either
 * way). On a real PostgreSQL, ten parallel logouts with one token: none may fail, exactly one revocation row exists.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.target=latest"
})
class LogoutConcurrencyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired AuthService authService;
    @Autowired com.enesucar.auth_service.security.JwtUtil jwtUtil;
    @Autowired com.enesucar.auth_service.repository.RevokedTokenRepository revoked;

    @Test
    void parallelLogoutsOfOneSessionAllSucceed() throws Exception {
        String token = jwtUtil.generateToken("logoutrace", "USER", 0, 4242L);
        String jti = jwtUtil.extractTokenId(token);

        int attempts = 10;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Throwable>> done = new ArrayList<>();
        try {
            for (int i = 0; i < attempts; i++) {
                done.add(pool.submit(() -> {
                    go.await();
                    try {
                        authService.logout(token);
                        return null;
                    } catch (Throwable t) {
                        return t;
                    }
                }));
            }
            go.countDown();
            List<String> failures = new ArrayList<>();
            for (Future<Throwable> f : done) {
                Throwable t = f.get(60, TimeUnit.SECONDS);
                if (t != null) failures.add(t.getClass().getSimpleName());
            }
            assertThat(failures).as("logouts that failed").isEmpty();
        } finally {
            pool.shutdownNow();
        }
        assertThat(revoked.existsById(jti)).isTrue();
        assertThat(revoked.count()).isEqualTo(1);
    }
}
