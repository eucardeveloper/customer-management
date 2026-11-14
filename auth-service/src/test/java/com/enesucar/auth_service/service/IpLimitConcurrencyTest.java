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
 * The per-address limit (30 failures) must hold when the wrong passwords arrive at the same instant. Sixty parallel
 * wrong passwords from one address, each for a different username (so the per-username lock never applies):
 * at most thirty are checked (401), the rest are refused with 429.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.target=latest"
})
class IpLimitConcurrencyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired AuthService authService;

    @Test
    void parallelWrongPasswordsFromOneAddressCannotSlipPastTheLimit() throws Exception {
        int attempts = 60;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger wrong = new AtomicInteger();
        AtomicInteger locked = new AtomicInteger();
        List<Future<?>> done = new ArrayList<>();
        try {
            for (int i = 0; i < attempts; i++) {
                final int n = i;
                done.add(pool.submit(() -> {
                    go.await();
                    LoginRequest request = new LoginRequest();
                    request.setUsername("ipuser" + n);
                    request.setPassword("Wrong-Password-9");
                    try {
                        authService.login(request, "198.51.100.7");
                    } catch (TooManyLoginAttemptsException e) {
                        locked.incrementAndGet();
                    } catch (AuthenticationException e) {
                        wrong.incrementAndGet();
                    }
                    return null;
                }));
            }
            go.countDown();
            for (Future<?> f : done) {
                f.get(120, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(wrong.get() + locked.get()).isEqualTo(attempts);
        assertThat(wrong.get()).as("wrong passwords that were actually checked").isLessThanOrEqualTo(30);
        assertThat(locked.get()).as("attempts refused by the address limit").isGreaterThanOrEqualTo(attempts - 30);
    }
}
