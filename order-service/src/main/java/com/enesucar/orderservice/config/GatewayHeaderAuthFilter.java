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
import java.util.List;

/**
 * Trusts the X-Auth-User and X-Auth-Role headers injected by the API Gateway
 * after it has validated the JWT. Populates the SecurityContext so that
 * downstream security rules work as expected.
 *
 * IMPORTANT: this service must only be reachable through the API Gateway.
 */
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String username = request.getHeader("X-Auth-User");
        String role = request.getHeader("X-Auth-Role");

        if (username != null && role != null && SecurityContextHolder.getContext().getAuthentication() == null) {
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
