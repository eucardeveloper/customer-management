package com.enesucar.auth_service.security;

import com.enesucar.auth_service.entity.LoginFailure;
import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import com.enesucar.auth_service.repository.LoginFailureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.function.Supplier;

/**
 * Slows down password guessing: after {@code maxFailures} failed sign-ins for one username inside the
 * sliding window the account is refused with 429 until the oldest failure ages out.
 *
 * Failures are stored in the database, so the lockout survives a restart and is shared by every
 * instance of the auth service. Trade-off: a stranger can temporarily lock a known username (the same
 * property every lockout scheme has); the window is short and a successful sign-in resets the counter.
 *
 * A second, looser limit counts failures per client address (key {@code ip:<address>}), so one source
 * cannot spread guesses over many usernames. It is deliberately higher than the per-username limit
 * because several people can share an address (office, NAT).
 */
@Component
public class LoginAttemptLimiter {

    private final int maxFailures;
    private final int ipMaxFailures;
    private final Duration window;
    private final Clock clock;
    private final LoginFailureRepository failures;
    private final TransactionTemplate ownTransaction;

    @Autowired
    public LoginAttemptLimiter(@Value("${app.login.max-failures:5}") int maxFailures,
                               @Value("${app.login.max-failures-per-ip:30}") int ipMaxFailures,
                               @Value("${app.login.window-seconds:900}") long windowSeconds,
                               LoginFailureRepository failures,
                               PlatformTransactionManager transactionManager) {
        this(maxFailures, ipMaxFailures, Duration.ofSeconds(windowSeconds), Clock.systemUTC(), failures, transactionManager);
    }

    LoginAttemptLimiter(int maxFailures, Duration window, Clock clock, LoginFailureRepository failures,
                        PlatformTransactionManager transactionManager) {
        this(maxFailures, maxFailures * 6, window, clock, failures, transactionManager);
    }

    LoginAttemptLimiter(int maxFailures, int ipMaxFailures, Duration window, Clock clock, LoginFailureRepository failures,
                        PlatformTransactionManager transactionManager) {
        this.maxFailures = maxFailures;
        this.ipMaxFailures = ipMaxFailures;
        this.window = window;
        this.clock = clock;
        this.failures = failures;
        // The reservation must be visible to other requests at once and must survive a rollback of the
        // caller's transaction (changePassword is transactional), so it always gets a transaction of its own.
        this.ownTransaction = new TransactionTemplate(transactionManager);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Throws {@link TooManyLoginAttemptsException} when the username is currently locked out. */
    public void checkAllowed(String username) {
        check(key(username), maxFailures);
    }

    /** Same, for a client address; a blank address is never limited (nothing to count against). */
    public void checkAllowedIp(String ip) {
        if (ip != null && !ip.isBlank()) {
            check(ipKey(ip), ipMaxFailures);
        }
    }

    public void recordFailureIp(String ip) {
        if (ip != null && !ip.isBlank()) {
            failures.save(new LoginFailure(ipKey(ip), now()));
        }
    }

    /**
     * Counts one attempt for the username and refuses it when that exceeds the limit.
     *
     * <p>The attempt is written first (committed on its own) and only then are the attempts counted, so
     * parallel requests cannot all pass a "count, then write" gap: of any set of attempts that are
     * allowed, the last one to be written already sees all the others. An attempt that is refused removes
     * its own row again, so a refused request does not extend the lock. A successful sign-in clears all
     * rows of the key via {@link #reset}; a wrong password simply leaves its row in place.
     */
    public void reserveAttempt(String username) {
        reserve(key(username), maxFailures);
    }

    private void reserve(String throttleKey, int max) {
        LoginFailure mine = inOwnTransaction(() -> failures.save(new LoginFailure(throttleKey, now())));
        LocalDateTime now = now();
        List<LoginFailure> others = failures
                .findByThrottleKeyAndAttemptedAtAfterOrderByAttemptedAtAsc(throttleKey, now.minus(window))
                .stream()
                .filter(f -> !f.getId().equals(mine.getId()))
                .toList();
        if (others.size() >= max) {
            inOwnTransaction(() -> {
                failures.deleteById(mine.getId());
                return null;
            });
            LocalDateTime unlock = others.get(others.size() - max).getAttemptedAt().plus(window);
            long retry = Duration.between(now, unlock).getSeconds();
            throw new TooManyLoginAttemptsException(Math.max(1, retry));
        }
    }

    private <T> T inOwnTransaction(Supplier<T> work) {
        return ownTransaction.execute(status -> work.get());
    }

    private void check(String throttleKey, int max) {
        LocalDateTime now = now();
        List<LoginFailure> recent = failures
                .findByThrottleKeyAndAttemptedAtAfterOrderByAttemptedAtAsc(throttleKey, now.minus(window));
        if (recent.size() >= max) {
            // the lock ends when enough of the oldest failures have left the window
            LocalDateTime unlock = recent.get(recent.size() - max).getAttemptedAt().plus(window);
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

    private static String ipKey(String ip) {
        return "ip:" + ip.trim().toLowerCase(Locale.ROOT);
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
