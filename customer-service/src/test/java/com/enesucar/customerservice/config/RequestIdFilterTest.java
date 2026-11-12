package com.enesucar.customerservice.config;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    /** Runs a request through the filter; returns {id seen in the log context while handling, id on the response}. */
    private String[] run(String incomingId) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/x");
        if (incomingId != null) {
            request.addHeader(RequestIdFilter.HEADER, incomingId);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> inside = new AtomicReference<>();
        filter.doFilter(request, response, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                inside.set(MDC.get(RequestIdFilter.MDC_KEY));
            }
        });
        return new String[]{inside.get(), response.getHeader(RequestIdFilter.HEADER)};
    }

    @Test
    void usesTheGatewaysIdInTheLogContextAndEchoesIt() throws Exception {
        String[] ids = run("gw-req-123456");
        assertThat(ids[0]).isEqualTo("gw-req-123456");
        assertThat(ids[1]).isEqualTo("gw-req-123456");
    }

    @Test
    void makesUpAnIdWhenNoneArrived() throws Exception {
        String[] ids = run(null);
        assertThat(ids[0]).hasSize(36);
        assertThat(ids[1]).isEqualTo(ids[0]);
    }

    @Test
    void replacesAnIdWithLineBreaksOrSpaces() throws Exception {
        String[] ids = run("abcd1234\r\nINFO forged");
        assertThat(ids[0]).hasSize(36).doesNotContain("\r").doesNotContain("\n");
    }

    @Test
    void clearsTheLogContextAfterTheRequest() throws Exception {
        run("gw-req-123456");
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }
}
