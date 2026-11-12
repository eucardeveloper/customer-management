package com.enesucar.apigateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    /** Runs the filter and returns {id the next hop sees, id on the response}. */
    private String[] run(String incomingId) {
        MockServerHttpRequest.BaseBuilder<?> req = MockServerHttpRequest.get("/api/customers");
        if (incomingId != null) {
            req.header(RequestIdFilter.HEADER, incomingId);
        }
        MockServerWebExchange exchange = MockServerWebExchange.from(req);
        AtomicReference<ServerWebExchange> seen = new AtomicReference<>();
        filter.filter(exchange, ex -> { seen.set(ex); return Mono.empty(); }).block();
        return new String[]{
                seen.get().getRequest().getHeaders().getFirst(RequestIdFilter.HEADER),
                exchange.getResponse().getHeaders().getFirst(RequestIdFilter.HEADER)};
    }

    @Test
    void generatesAnIdWhenTheCallerSentNone() {
        String[] ids = run(null);
        assertThat(ids[0]).isNotBlank().hasSize(36);
        assertThat(ids[1]).isEqualTo(ids[0]);
    }

    @Test
    void keepsAWellFormedIdFromTheCaller() {
        String[] ids = run("client-req-12345");
        assertThat(ids[0]).isEqualTo("client-req-12345");
        assertThat(ids[1]).isEqualTo("client-req-12345");
    }

    @Test
    void replacesAnIdThatCouldForgeLogLines() {
        String[] ids = run("abc12345 INFO fake entry");
        assertThat(ids[0]).doesNotContain(" ").hasSize(36);
        assertThat(ids[1]).isEqualTo(ids[0]);
    }

    @Test
    void replacesAnIdThatIsTooShortOrTooLong() {
        assertThat(run("short")[0]).hasSize(36);
        assertThat(run("x".repeat(65))[0]).hasSize(36);
    }

    @Test
    void runsBeforeTheJwtFilter() {
        assertThat(filter.getOrder()).isLessThan(new JwtAuthFilter(null).getOrder());
    }
}
