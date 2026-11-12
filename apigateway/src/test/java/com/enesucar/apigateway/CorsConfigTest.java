package com.enesucar.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.cors.reactive.CorsWebFilter;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** What a browser at the panel's origin is told about the gateway's CORS rules. */
class CorsConfigTest {

    private final CorsWebFilter filter = new CorsConfig().corsWebFilter(List.of("http://localhost:3000"));

    @Test
    void theRequestIdIsExposedToBrowserScripts() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("http://localhost:8080/api/customers").header("Origin", "http://localhost:3000"));

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getHeaders().getFirst("Access-Control-Expose-Headers"))
                .contains("X-Request-Id");
        assertThat(exchange.getResponse().getHeaders().getFirst("Access-Control-Allow-Credentials")).isEqualTo("true");
    }

    @Test
    void aBrowserMayPreflightACallThatCarriesTheRequestId() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .options("http://localhost:8080/api/customers")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "x-request-id"));

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getHeaders().getFirst("Access-Control-Allow-Headers"))
                .containsIgnoringCase("X-Request-Id");
    }

    @Test
    void aForeignOriginGetsNoCorsHeaders() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("http://localhost:8080/api/customers").header("Origin", "http://evil.example"));

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getHeaders().getFirst("Access-Control-Allow-Origin")).isNull();
    }
}
