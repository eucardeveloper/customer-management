package com.enesucar.apigateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Logout must make the gateway stop honouring the token at once, whichever way the client presented it. */
class JwtAuthFilterLogoutTest {

    private final List<String> forgotten = new ArrayList<>();

    private final SessionValidator recording = new SessionValidator() {
        @Override
        public Mono<SessionInfo> validate(String token) {
            return Mono.empty();
        }

        @Override
        public void forget(String token) {
            forgotten.add(token);
        }
    };

    private JwtAuthFilter filter() {
        JwtAuthFilter filter = new JwtAuthFilter(recording);
        ReflectionTestUtils.setField(filter, "secret", "test-only-secret-key-minimum-256-bits-long-for-hs256-signing");
        ReflectionTestUtils.setField(filter, "allowedOrigins", List.of("http://localhost:3000"));
        return filter;
    }

    private void run(MockServerHttpRequest.BaseBuilder<?> request) {
        filter().filter(MockServerWebExchange.from(request.build()), ex -> Mono.empty()).block();
    }

    @Test
    void logoutWithTheCookieForgetsTheCachedSession() {
        run(MockServerHttpRequest.post("/api/auth/logout")
                .header("Cookie", JwtAuthFilter.COOKIE_NAME + "=cookie-token"));
        assertThat(forgotten).containsExactly("cookie-token");
    }

    @Test
    void logoutWithABearerHeaderForgetsTheCachedSessionToo() {
        run(MockServerHttpRequest.post("/api/auth/logout").header("Authorization", "Bearer bearer-token"));
        assertThat(forgotten).containsExactly("bearer-token");
    }
}
