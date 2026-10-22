package com.enesucar.orderservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Trusts the X-Auth-User and X-Auth-Role headers injected by the API Gateway
 * after it has validated the JWT. Populates the SecurityContext so that
 * downstream security rules work as expected.
 *
 * When a shared secret is configured ({@code gateway.shared-secret}) the headers are only honoured if
 * the request also carries it in X-Gateway-Secret, so another container on the network cannot invent
 * an identity. The comparison is constant-time. A service started without a secret refuses to start
 * (see {@link #create}); only tests opt out with {@code gateway.allow-unsigned-headers=true}.
 */
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    static final String SECRET_HEADER = "X-Gateway-Secret";

    private final String sharedSecret;

    public GatewayHeaderAuthFilter() {
        this("");
    }

    public GatewayHeaderAuthFilter(String sharedSecret) {
        this.sharedSecret = sharedSecret == null ? "" : sharedSecret;
    }

    /**
     * The filter the application uses. A missing secret is a deployment mistake that would let anyone who
     * can reach the service claim to be an ADMIN, so it stops the start-up instead of failing open.
     */
    public static GatewayHeaderAuthFilter create(String sharedSecret, boolean allowUnsignedHeaders) {
        if ((sharedSecret == null || sharedSecret.isBlank()) && !allowUnsignedHeaders) {
            throw new IllegalStateException("GATEWAY_SHARED_SECRET is not set. Without it any caller on the network could "
                    + "claim to be an ADMIN. Set it to the gateway's value (tests only: gateway.allow-unsigned-headers=true).");
        }
        return new GatewayHeaderAuthFilter(sharedSecret);
    }

    private boolean fromGateway(HttpServletRequest request) {
        if (sharedSecret.isBlank()) {
            return true;
        }
        String presented = request.getHeader(SECRET_HEADER);
        return presented != null && MessageDigest.isEqual(
                presented.getBytes(StandardCharsets.UTF_8), sharedSecret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String username = request.getHeader("X-Auth-User");
        String role = request.getHeader("X-Auth-Role");

        if (fromGateway(request) && username != null && role != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;
            var auth = new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    List.of(new SimpleGrantedAuthority(authority))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
