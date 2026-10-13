package com.enesucar.auth_service.security;

import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** A token must stop working once the account's token version moves on (password/role change). */
class JwtAuthenticationFilterTest {

    private JwtUtil jwtUtil;
    private UserRepository userRepository;
    private JwtAuthenticationFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 3_600_000L);
        userRepository = mock(UserRepository.class);
        filter = new JwtAuthenticationFilter(jwtUtil, userRepository);
        chain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User account(int version, Role role) {
        return User.builder().id(1L).username("alice").email("a@a.com").password("x").role(role).tokenVersion(version).build();
    }

    private MockHttpServletRequest bearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    @Test
    void acceptsToken_whenVersionMatches() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(account(2, Role.USER)));
        filter.doFilter(bearer(jwtUtil.generateToken("alice", "USER", 2)), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("alice");
    }

    @Test
    void rejectsToken_whenPasswordWasChangedSinceIssue() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(account(3, Role.USER)));
        filter.doFilter(bearer(jwtUtil.generateToken("alice", "USER", 2)), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void rejectsToken_whenUserNoLongerExists() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.empty());
        filter.doFilter(bearer(jwtUtil.generateToken("alice", "USER", 0)), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void usesRoleFromDatabase_notFromToken() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(account(0, Role.USER)));
        filter.doFilter(bearer(jwtUtil.generateToken("alice", "ADMIN", 0)), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting(Object::toString).containsExactly("ROLE_USER");
    }

    @Test
    void legacyTokenWithoutVersion_countsAsVersionZero() throws Exception {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(account(0, Role.USER)));
        filter.doFilter(bearer(jwtUtil.generateToken("alice", "USER")), new MockHttpServletResponse(), chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }
}
