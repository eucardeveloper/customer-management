package com.enesucar.auth_service.security;

import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing: after {@code maxFailures} failed sign-ins for one username inside the
 * sliding window the account is refused with 429 until the oldest failure ages out.
 *
 * In memory and per instance, which is enough for a single auth service. Trade-off: a stranger can
 * temporarily lock a known username (the same property every lockout scheme has); the window is short
 * and a success resets the counter. A multi-instance deployment would move this to Redis.
 */
@Component
public class LoginAttemptLimiter {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final int maxFailures;
    private final Duration window;
    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    @Autowired
    public LoginAttemptLimiter(@Value("${app.login.max-failures:5}") int maxFailures,
                               @Value("${app.login.window-seconds:900}") long windowSeconds) {
        this(maxFailures, Duration.ofSeconds(windowSeconds), Clock.systemUTC());
    }

    LoginAttemptLimiter(int maxFailures, Duration window, Clock clock) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.clock = clock;
    }

    /** Throws {@link TooManyLoginAttemptsException} when the username is currently locked out. */
    public void checkAllowed(String username) {
        Deque<Instant> attempts = failures.get(key(username));
        if (attempts == null) {
            return;
        }
        synchronized (attempts) {
            prune(attempts);
            if (attempts.size() >= maxFailures) {
                long retry = Duration.between(clock.instant(), attempts.peekFirst().plus(window)).getSeconds();
                throw new TooManyLoginAttemptsException(Math.max(1, retry));
            }
        }
    }

    public void recordFailure(String username) {
        if (failures.size() > MAX_TRACKED_KEYS) {
            evictExpired();
        }
        Deque<Instant> attempts = failures.computeIfAbsent(key(username), k -> new ArrayDeque<>());
        synchronized (attempts) {
            prune(attempts);
            attempts.addLast(clock.instant());
        }
    }

    public void reset(String username) {
        failures.remove(key(username));
    }

    private void prune(Deque<Instant> attempts) {
        Instant cutoff = clock.instant().minus(window);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
            attempts.pollFirst();
        }
    }

    private void evictExpired() {
        failures.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue());
                return e.getValue().isEmpty();
            }
        });
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
