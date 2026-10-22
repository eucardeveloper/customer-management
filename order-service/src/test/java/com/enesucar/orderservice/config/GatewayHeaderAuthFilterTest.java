package com.enesucar.orderservice.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GatewayHeaderAuthFilterTest {

    private final FilterChain chain = mock(FilterChain.class);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest request(String secretHeader) {
        var r = new MockHttpServletRequest("GET", "/api/anything");
        r.addHeader("X-Auth-User", "alice");
        r.addHeader("X-Auth-Role", "ADMIN");
        if (secretHeader != null) r.addHeader("X-Gateway-Secret", secretHeader);
        return r;
    }

    @Test
    void withTheRightSecretTheHeadersBecomeTheIdentity() throws Exception {
        new GatewayHeaderAuthFilter("s3cret").doFilter(request("s3cret"), new MockHttpServletResponse(), chain);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo("alice");
        assertThat(auth.getAuthorities()).extracting(Object::toString).containsExactly("ROLE_ADMIN");
    }

    @Test
    void withoutOrWithAWrongSecretTheHeadersAreIgnored() throws Exception {
        new GatewayHeaderAuthFilter("s3cret").doFilter(request(null), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

        new GatewayHeaderAuthFilter("s3cret").doFilter(request("guess"), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void withoutAConfiguredSecretTheHeadersAreTrustedAsBefore() throws Exception {
        new GatewayHeaderAuthFilter().doFilter(request(null), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void theServiceRefusesToStartWithoutASecret() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> GatewayHeaderAuthFilter.create("", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GATEWAY_SHARED_SECRET");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> GatewayHeaderAuthFilter.create(null, false))
                .isInstanceOf(IllegalStateException.class);
        assertThat(GatewayHeaderAuthFilter.create("s3cret", false)).isNotNull();
        assertThat(GatewayHeaderAuthFilter.create("", true)).isNotNull(); // tests only
    }
}
