package com.enesucar.auth_service.security;

import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptLimiterTest {

    /** A clock the test can move forward. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T10:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final MutableClock clock = new MutableClock();
    private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(3, Duration.ofMinutes(15), clock);

    @Test
    void allowsAttemptsBelowTheLimit() {
        limiter.recordFailure("ali");
        limiter.recordFailure("ali");

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void locksTheAccountAfterTooManyFailuresAndReportsRetryTime() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");

        assertThatThrownBy(() -> limiter.checkAllowed("ali"))
                .isInstanceOfSatisfying(TooManyLoginAttemptsException.class,
                        ex -> assertThat(ex.getRetryAfterSeconds()).isEqualTo(900));
    }

    @Test
    void unlocksOnceTheOldestFailureLeavesTheWindow() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");
        clock.advance(Duration.ofMinutes(16));

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void successfulSignInClearsTheCounter() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");
        limiter.reset("ali");

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void doesNotMixUpDifferentUsersAndIgnoresCaseAndWhitespace() {
        for (int i = 0; i < 3; i++) limiter.recordFailure("  ALI ");

        assertThatThrownBy(() -> limiter.checkAllowed("ali")).isInstanceOf(TooManyLoginAttemptsException.class);
        assertThatCode(() -> limiter.checkAllowed("veli")).doesNotThrowAnyException();
    }
}
