package com.enesucar.apigateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Gateway JWT filter")
class JwtAuthFilterTest {

    private static final String SECRET = "test-only-secret-key-minimum-256-bits-long-for-hs256-signing";
    private static final String ORIGIN = "http://localhost:3000";

    private JwtAuthFilter filter;
    private final AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter();
        ReflectionTestUtils.setField(filter, "secret", SECRET);
        ReflectionTestUtils.setField(filter, "allowedOrigins", List.of(ORIGIN));
    }

    private String token(String user, String role) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder().subject(user).claim("role", role).signWith(key).compact();
    }

    /** Same claims, signed with a different key: what an attacker without the secret can produce. */
    private String forged(String user, String role) {
        SecretKey other = Keys.hmacShaKeyFor("another-secret-key-minimum-256-bits-long-for-hs256-attacker".getBytes(StandardCharsets.UTF_8));
        return Jwts.builder().subject(user).claim("role", role).signWith(other).compact();
    }

    private MockServerWebExchange run(MockServerHttpRequest.BaseBuilder<?> request) {
        MockServerWebExchange exchange = MockServerWebExchange.from(request.build());
        filter.filter(exchange, ex -> { forwarded.set(ex); return Mono.empty(); }).block();
        return exchange;
    }

    @Test
    @DisplayName("no credentials: 401 and nothing is forwarded")
    void noCredentials() {
        MockServerWebExchange ex = run(MockServerHttpRequest.get("/api/customers"));
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    @DisplayName("tampered token: 401")
    void tamperedToken() {
        MockServerWebExchange ex = run(MockServerHttpRequest.get("/api/customers")
                .header("Authorization", "Bearer " + forged("a", "ADMIN")));
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    @DisplayName("Bearer header still works and the verified identity is forwarded")
    void bearerHeader() {
        run(MockServerHttpRequest.get("/api/customers").header("Authorization", "Bearer " + token("alice", "ADMIN")));
        assertThat(forwarded.get()).isNotNull();
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Auth-User")).isEqualTo("alice");
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Auth-Role")).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("session cookie authenticates a read")
    void cookieRead() {
        run(MockServerHttpRequest.get("/api/customers").cookie(new HttpCookie("access_token", token("bob", "USER"))));
        assertThat(forwarded.get()).isNotNull();
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Auth-User")).isEqualTo("bob");
        // downstream services get a Bearer header, not the browser cookie
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("Authorization")).startsWith("Bearer ");
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("Cookie")).isNull();
    }

    @Test
    @DisplayName("cookie + write without an allowed Origin: 403")
    void cookieWriteNeedsOrigin() {
        HttpCookie cookie = new HttpCookie("access_token", token("bob", "USER"));

        MockServerWebExchange none = run(MockServerHttpRequest.post("/api/orders").cookie(cookie));
        assertThat(none.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        MockServerWebExchange foreign = run(MockServerHttpRequest.delete("/api/orders/1")
                .cookie(cookie).header("Origin", "https://evil.example"));
        assertThat(foreign.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    @DisplayName("cookie + write from our own origin passes")
    void cookieWriteFromOwnOrigin() {
        run(MockServerHttpRequest.post("/api/orders")
                .cookie(new HttpCookie("access_token", token("bob", "USER"))).header("Origin", ORIGIN));
        assertThat(forwarded.get()).isNotNull();
    }

    @Test
    @DisplayName("a client cannot choose its own identity headers")
    void identityHeadersAreOverwritten() {
        run(MockServerHttpRequest.get("/api/customers")
                .header("Authorization", "Bearer " + token("real", "USER"))
                .header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"));
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Auth-User")).isEqualTo("real");
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Auth-Role")).isEqualTo("USER");
    }

    @Test
    @DisplayName("login and logout are reachable without a token")
    void publicPaths() {
        run(MockServerHttpRequest.post("/api/auth/login"));
        assertThat(forwarded.get()).isNotNull();
        forwarded.set(null);
        run(MockServerHttpRequest.post("/api/auth/logout"));
        assertThat(forwarded.get()).isNotNull();
    }
}
