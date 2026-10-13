package com.enesucar.apigateway.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Auth-service session validator")
class AuthServiceSessionValidatorTest {

    private final AtomicInteger calls = new AtomicInteger();

    private AuthServiceSessionValidator validatorAnswering(HttpStatus status, String body, long cacheSeconds) {
        WebClient client = WebClient.builder().baseUrl("http://auth").exchangeFunction(request -> {
            calls.incrementAndGet();
            assertThat(request.headers().getFirst("Authorization")).isEqualTo("Bearer tok");
            ClientResponse.Builder b = ClientResponse.create(status);
            if (body != null) b.header("Content-Type", MediaType.APPLICATION_JSON_VALUE).body(body);
            return Mono.just(b.build());
        }).build();
        return new AuthServiceSessionValidator(client, cacheSeconds);
    }

    @Test
    @DisplayName("200 returns the identity the auth-service reports")
    void valid() {
        var v = validatorAnswering(HttpStatus.OK, "{\"username\":\"alice\",\"role\":\"ADMIN\"}", 0);
        assertThat(v.validate("tok").block()).isEqualTo(new SessionInfo("alice", "ADMIN"));
    }

    @Test
    @DisplayName("401 and 403 mean revoked: empty result")
    void revoked() {
        assertThat(validatorAnswering(HttpStatus.UNAUTHORIZED, null, 0).validate("tok").block()).isNull();
        assertThat(validatorAnswering(HttpStatus.FORBIDDEN, null, 0).validate("tok").block()).isNull();
    }

    @Test
    @DisplayName("5xx is an error, never a silent pass")
    void serverError() {
        var v = validatorAnswering(HttpStatus.INTERNAL_SERVER_ERROR, null, 0);
        assertThatThrownBy(() -> v.validate("tok").block()).hasMessageContaining("500");
    }

    @Test
    @DisplayName("positive answers are cached for the configured time, negative ones are not")
    void caching() {
        var ok = validatorAnswering(HttpStatus.OK, "{\"username\":\"alice\",\"role\":\"USER\"}", 30);
        ok.validate("tok").block();
        ok.validate("tok").block();
        assertThat(calls.get()).isEqualTo(1);

        calls.set(0);
        var revoked = validatorAnswering(HttpStatus.UNAUTHORIZED, null, 30);
        revoked.validate("tok").block();
        revoked.validate("tok").block();
        assertThat(calls.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("forget() drops the cached answer so the next call asks again")
    void forget() {
        var v = validatorAnswering(HttpStatus.OK, "{\"username\":\"alice\",\"role\":\"USER\"}", 30);
        v.validate("tok").block();
        v.forget("tok");
        v.validate("tok").block();
        assertThat(calls.get()).isEqualTo(2);
    }
}
