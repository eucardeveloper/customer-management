package com.enesucar.apigateway.filter;

import reactor.core.publisher.Mono;

/**
 * Asks whether a (signature-valid) token is still honoured. An empty Mono means "revoked or unknown";
 * an error means "could not find out" and the gateway then refuses the request (fail closed).
 */
public interface SessionValidator {
    Mono<SessionInfo> validate(String token);
}
