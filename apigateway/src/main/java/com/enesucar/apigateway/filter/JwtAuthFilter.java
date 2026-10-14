package com.enesucar.apigateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secret;

    /** Origins allowed to call the API from a browser (same list as the CORS configuration). */
    @Value("#{'${app.allowed-origins}'.split(',')}")
    private List<String> allowedOrigins;

    /**
     * Shared with the customer and order services. They only trust the X-Auth-* headers when this
     * secret comes with them, so anything else on the network (another container, a misconfigured
     * public port) cannot make up an identity. Empty = not configured (local tests only).
     */
    @Value("${gateway.shared-secret:}")
    private String gatewaySecret;

    static final String GATEWAY_SECRET_HEADER = "X-Gateway-Secret";
    static final String COOKIE_NAME = "customer_session";

    private final SessionValidator sessionValidator;

    public JwtAuthFilter(SessionValidator sessionValidator) {
        this.sessionValidator = sessionValidator;
    }

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/logout"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            if (path.startsWith("/api/auth/logout")) {
                // The auth-service revokes the token; forget the cached "still valid" answer so it stops now.
                HttpCookie session = exchange.getRequest().getCookies().getFirst(COOKIE_NAME);
                if (session != null && !session.getValue().isBlank()) {
                    sessionValidator.forget(session.getValue());
                }
            }
            return chain.filter(exchange);
        }

        // The browser session is an HttpOnly cookie; API clients may still send a Bearer header.
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        String token = null;
        boolean fromCookie = false;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            HttpCookie cookie = exchange.getRequest().getCookies().getFirst(COOKIE_NAME);
            if (cookie != null && !cookie.getValue().isBlank()) {
                token = cookie.getValue();
                fromCookie = true;
            }
        }

        if (token == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Cookies are sent automatically, so a request that changes data and authenticates with the
        // cookie must come from one of our own pages (SameSite=Strict is the first line of defence,
        // this is the second).
        if (fromCookie && isStateChanging(exchange.getRequest().getMethod())) {
            String origin = exchange.getRequest().getHeaders().getOrigin();
            if (origin == null || !allowedOrigins.contains(origin)) {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }
        }

        try {
            SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // The signature is fine, but the session may have been ended since (password or role change).
        // Only the auth-service knows, so ask it. If it cannot answer, refuse rather than guess.
        final String bearer = token;
        return sessionValidator.validate(bearer)
                .map(Optional::of)
                .defaultIfEmpty(Optional.empty())
                .onErrorReturn(Optional.of(new SessionInfo(null, null)))
                .flatMap(result -> {
                    if (result.isEmpty()) {
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    }
                    SessionInfo info = result.get();
                    if (info.username() == null) {
                        exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
                        return exchange.getResponse().setComplete();
                    }
                    // Downstream services (auth-service validates the JWT itself) only understand the
                    // Authorization header, so a cookie session is translated here and the cookie is not
                    // passed on. Identity and role come from the auth-service's answer, not from the token.
                    ServerWebExchange mutatedExchange = exchange.mutate()
                            .request(r -> r.headers(h -> {
                                h.set("Authorization", "Bearer " + bearer);
                                h.remove("Cookie");
                                h.set("X-Auth-User", info.username());
                                h.set("X-Auth-Role", info.role());
                                if (gatewaySecret != null && !gatewaySecret.isBlank()) {
                                    h.set(GATEWAY_SECRET_HEADER, gatewaySecret);
                                } else {
                                    h.remove(GATEWAY_SECRET_HEADER); // never pass on one a client made up
                                }
                            }))
                            .build();
                    return chain.filter(mutatedExchange);
                });
    }

    private static boolean isStateChanging(HttpMethod method) {
        return HttpMethod.POST.equals(method) || HttpMethod.PUT.equals(method)
                || HttpMethod.PATCH.equals(method) || HttpMethod.DELETE.equals(method);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}