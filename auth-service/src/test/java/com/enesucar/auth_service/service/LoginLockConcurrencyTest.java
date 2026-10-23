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
 * The lock must also hold when the wrong passwords arrive at the same instant. Twenty parallel wrong
 * passwords for one account on a real PostgreSQL: at most five are checked (and answered 401), every
 * other one is refused with 429, and the correct password is refused afterwards while the lock lasts.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.target=latest"
})
class LoginLockConcurrencyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired AuthService authService;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;

    @Test
    void parallelWrongPasswordsCannotSlipPastTheLock() throws Exception {
        users.save(User.builder().username("lockme").email("lockme@example.com")
                .password(encoder.encode("Right-Password-1")).role(Role.USER).build());

        int attempts = 20;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger wrong = new AtomicInteger();
        AtomicInteger locked = new AtomicInteger();
        List<Future<?>> done = new ArrayList<>();
        try {
            for (int i = 0; i < attempts; i++) {
                done.add(pool.submit(() -> {
                    go.await();
                    LoginRequest request = new LoginRequest();
                    request.setUsername("lockme");
                    request.setPassword("Wrong-Password-9");
                    try {
                        authService.login(request);
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
                f.get(60, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(wrong.get() + locked.get()).isEqualTo(attempts);
        assertThat(wrong.get()).as("wrong passwords that were actually checked").isLessThanOrEqualTo(5);
        assertThat(locked.get()).as("attempts refused by the lock").isGreaterThanOrEqualTo(attempts - 5);

        LoginRequest correct = new LoginRequest();
        correct.setUsername("lockme");
        correct.setPassword("Right-Password-1");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.login(correct))
                .as("the account stays locked, even for the right password")
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }
}
