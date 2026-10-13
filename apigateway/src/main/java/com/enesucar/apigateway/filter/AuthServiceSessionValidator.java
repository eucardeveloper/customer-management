package com.enesucar.apigateway.filter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Confirms a token with the auth-service (GET /api/auth/session), which compares the token's version
 * with the account's current one. Positive answers are cached briefly so the check is not a network
 * hop per request; that cache is also the longest time a revoked session can keep working.
 */
@Component
public class AuthServiceSessionValidator implements SessionValidator {

    private static final int MAX_CACHE_ENTRIES = 10_000;

    private record Cached(SessionInfo info, long expiresAtMillis) {}

    private final WebClient client;
    private final long ttlMillis;
    private final ConcurrentHashMap<String, Cached> cache = new ConcurrentHashMap<>();

    @Autowired
    public AuthServiceSessionValidator(@Value("${auth.service.url}") String authServiceUrl,
                                       @Value("${app.session-cache-seconds:10}") long cacheSeconds) {
        // Built directly: Spring Boot 4 no longer provides a WebClient.Builder bean unless the
        // webclient starter is added, and this is the only place the gateway needs one.
        this(WebClient.builder().baseUrl(authServiceUrl).build(), cacheSeconds);
    }

    AuthServiceSessionValidator(WebClient client, long cacheSeconds) {
        this.client = client;
        this.ttlMillis = cacheSeconds * 1000;
    }

    @Override
    public Mono<SessionInfo> validate(String token) {
        String key = fingerprint(token);
        Cached hit = cache.get(key);
        if (hit != null && hit.expiresAtMillis() > System.currentTimeMillis()) {
            return Mono.just(hit.info());
        }
        return client.get().uri("/api/auth/session")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchangeToMono(response -> {
                    int status = response.statusCode().value();
                    if (response.statusCode().is2xxSuccessful()) {
                        return response.bodyToMono(SessionInfo.class);
                    }
                    if (status == 401 || status == 403) {
                        return response.releaseBody().then(Mono.<SessionInfo>empty());
                    }
                    return response.releaseBody()
                            .then(Mono.<SessionInfo>error(new IllegalStateException("auth-service answered " + status)));
                })
                .timeout(Duration.ofSeconds(3))
                .doOnNext(info -> remember(key, info));
    }

    @Override
    public void forget(String token) {
        cache.remove(fingerprint(token));
    }

    private void remember(String key, SessionInfo info) {
        if (ttlMillis <= 0) return;
        if (cache.size() >= MAX_CACHE_ENTRIES) cache.clear();
        cache.put(key, new Cached(info, System.currentTimeMillis() + ttlMillis));
    }

    /** The cache is keyed by a hash so raw tokens are never kept in memory longer than the request. */
    private static String fingerprint(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
