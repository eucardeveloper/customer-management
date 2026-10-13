package com.enesucar.auth_service.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** One failed attempt for a throttle key (a username, or "pwchange:" + username); see V6 migration. */
@Entity
@Table(name = "login_failure")
public class LoginFailure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "throttle_key", nullable = false)
    private String throttleKey;

    @Column(name = "attempted_at", nullable = false)
    private LocalDateTime attemptedAt;

    protected LoginFailure() {
    }

    public LoginFailure(String throttleKey, LocalDateTime attemptedAt) {
        this.throttleKey = throttleKey;
        this.attemptedAt = attemptedAt;
    }

    public Long getId() { return id; }
    public String getThrottleKey() { return throttleKey; }
    public LocalDateTime getAttemptedAt() { return attemptedAt; }
}
