package com.enesucar.auth_service.security;

import com.enesucar.auth_service.entity.LoginFailure;
import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import com.enesucar.auth_service.repository.LoginFailureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

/**
 * Slows down password guessing: after {@code maxFailures} failed sign-ins for one username inside the
 * sliding window the account is refused with 429 until the oldest failure ages out.
 *
 * Failures are stored in the database, so the lockout survives a restart and is shared by every
 * instance of the auth service. Trade-off: a stranger can temporarily lock a known username (the same
 * property every lockout scheme has); the window is short and a successful sign-in resets the counter.
 * There is no per-IP limit; that belongs at the gateway or a reverse proxy.
 */
@Component
public class LoginAttemptLimiter {

    private final int maxFailures;
    private final Duration window;
    private final Clock clock;
    private final LoginFailureRepository failures;

    @Autowired
    public LoginAttemptLimiter(@Value("${app.login.max-failures:5}") int maxFailures,
                               @Value("${app.login.window-seconds:900}") long windowSeconds,
                               LoginFailureRepository failures) {
        this(maxFailures, Duration.ofSeconds(windowSeconds), Clock.systemUTC(), failures);
    }

    LoginAttemptLimiter(int maxFailures, Duration window, Clock clock, LoginFailureRepository failures) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.clock = clock;
        this.failures = failures;
    }

    /** Throws {@link TooManyLoginAttemptsException} when the username is currently locked out. */
    public void checkAllowed(String username) {
        LocalDateTime now = now();
        List<LoginFailure> recent = failures
                .findByThrottleKeyAndAttemptedAtAfterOrderByAttemptedAtAsc(key(username), now.minus(window));
        if (recent.size() >= maxFailures) {
            // the lock ends when enough of the oldest failures have left the window
            LocalDateTime unlock = recent.get(recent.size() - maxFailures).getAttemptedAt().plus(window);
            long retry = Duration.between(now, unlock).getSeconds();
            throw new TooManyLoginAttemptsException(Math.max(1, retry));
        }
    }

    public void recordFailure(String username) {
        failures.save(new LoginFailure(key(username), now()));
    }

    public void reset(String username) {
        failures.deleteAllByKey(key(username));
    }

    /** Housekeeping: failures older than the window can never count again. */
    @Scheduled(fixedDelayString = "${app.login.cleanup-ms:600000}", initialDelay = 60_000)
    public void purgeExpired() {
        failures.deleteOlderThan(now().minus(window));
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
