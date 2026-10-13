package com.enesucar.auth_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.enesucar.auth_service.repository.RevokedTokenRepository;
import com.enesucar.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final RevokedTokenRepository revokedTokens;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                String username = jwtUtil.extractUsername(token);
                // A token only counts while its version matches the account: a password change or
                // role change bumps the version and ends every older session.
                int tokenVersion = jwtUtil.extractTokenVersion(token);
                var account = userRepository.findByUsername(username);
                if (account.isEmpty() || account.get().getTokenVersion() != tokenVersion) {
                    filterChain.doFilter(request, response);
                    return;
                }
                String tokenId = jwtUtil.extractTokenId(token);
                if (tokenId != null && revokedTokens.existsById(tokenId)) { // ended by logout
                    filterChain.doFilter(request, response);
                    return;
                }
                // The role comes from the database, not from the token, so a demotion applies at once.
                String role = account.get().getRole().name();
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }
}