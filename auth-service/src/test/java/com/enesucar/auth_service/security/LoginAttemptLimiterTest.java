package com.enesucar.auth_service.security;

import com.enesucar.auth_service.exception.TooManyLoginAttemptsException;
import com.enesucar.auth_service.repository.LoginFailureRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Runs against a real (in-memory) database, because the limiter's state lives in the database now. */
@SpringBootTest
@Transactional
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

    @Autowired
    LoginFailureRepository repository;

    private final MutableClock clock = new MutableClock();

    private LoginAttemptLimiter limiter() {
        return new LoginAttemptLimiter(3, Duration.ofMinutes(15), clock, repository);
    }

    @Test
    void allowsAttemptsBelowTheLimit() {
        var limiter = limiter();
        limiter.recordFailure("ali");
        limiter.recordFailure("ali");

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void locksTheAccountAfterTooManyFailuresAndReportsRetryTime() {
        var limiter = limiter();
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");

        assertThatThrownBy(() -> limiter.checkAllowed("ali"))
                .isInstanceOfSatisfying(TooManyLoginAttemptsException.class,
                        ex -> assertThat(ex.getRetryAfterSeconds()).isEqualTo(900));
    }

    @Test
    void unlocksOnceTheOldestFailureLeavesTheWindow() {
        var limiter = limiter();
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");
        clock.advance(Duration.ofMinutes(16));

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void successfulSignInClearsTheCounter() {
        var limiter = limiter();
        for (int i = 0; i < 3; i++) limiter.recordFailure("ali");
        limiter.reset("ali");

        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException();
    }

    @Test
    void doesNotMixUpDifferentUsersAndIgnoresCaseAndWhitespace() {
        var limiter = limiter();
        for (int i = 0; i < 3; i++) limiter.recordFailure("  ALI ");

        assertThatThrownBy(() -> limiter.checkAllowed("ali")).isInstanceOf(TooManyLoginAttemptsException.class);
        assertThatCode(() -> limiter.checkAllowed("veli")).doesNotThrowAnyException();
    }

    @Test
    void anotherInstanceSharingTheDatabaseSeesTheSameLockout() {
        for (int i = 0; i < 3; i++) limiter().recordFailure("ali");

        // a second limiter object stands in for a second auth-service instance (or a restart)
        assertThatThrownBy(() -> limiter().checkAllowed("ali")).isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void purgeRemovesFailuresThatCanNoLongerCount() {
        var limiter = limiter();
        limiter.recordFailure("ali");
        clock.advance(Duration.ofMinutes(16));
        limiter.purgeExpired();

        assertThat(repository.count()).isZero();
    }

    @Test
    void oneAddressIsLockedAfterTooManyFailuresEvenAcrossDifferentUsernames() {
        var limiter = new LoginAttemptLimiter(3, 4, Duration.ofMinutes(15), clock, repository);
        for (int i = 0; i < 4; i++) limiter.recordFailureIp("203.0.113.9");

        assertThatThrownBy(() -> limiter.checkAllowedIp("203.0.113.9"))
                .isInstanceOf(TooManyLoginAttemptsException.class);
        assertThatCode(() -> limiter.checkAllowedIp("203.0.113.10")).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkAllowed("ali")).doesNotThrowAnyException(); // usernames are separate
    }

    @Test
    void aMissingAddressIsNeverLimited() {
        var limiter = limiter();
        limiter.recordFailureIp(null);
        assertThatCode(() -> limiter.checkAllowedIp(null)).doesNotThrowAnyException();
        assertThatCode(() -> limiter.checkAllowedIp("")).doesNotThrowAnyException();
    }
}
