package com.enesucar.auth_service.security;

import com.enesucar.auth_service.repository.RevokedTokenRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Keeps the revocation table small: a revoked token that has expired no longer needs a row. */
@Component
public class RevokedTokenCleaner {

    private final RevokedTokenRepository repository;

    public RevokedTokenCleaner(RevokedTokenRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedDelayString = "${auth.revoked-token-cleanup-ms:3600000}", initialDelay = 60_000)
    public void purge() {
        repository.deleteExpired(LocalDateTime.now());
    }
}
