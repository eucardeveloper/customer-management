package com.enesucar.auth_service.controller;

import com.enesucar.auth_service.dto.AuthResponse;
import com.enesucar.auth_service.dto.LoginRequest;
import com.enesucar.auth_service.dto.RegisterRequest;
import com.enesucar.auth_service.exception.UserAlreadyExistsException;
import com.enesucar.auth_service.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class AuthControllerTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    // Spring Boot 4 auto-configures Jackson 3; these tests only serialise request bodies, so a plain mapper is enough.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@test.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        authResponse = new AuthResponse("jwt-token", "testuser", "USER");
    }

    @Test
    void register_shouldReturn200_whenValidRequest() throws Exception {
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("customer_session=jwt-token"),
                        org.hamcrest.Matchers.containsString("HttpOnly"),
                        org.hamcrest.Matchers.containsString("SameSite=Strict"),
                        org.hamcrest.Matchers.containsString("Secure"))))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void register_shouldReturn409_whenUsernameAlreadyExists() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new UserAlreadyExistsException("Username already taken"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict());
    }

    @Test
    void register_shouldReturn400_whenInvalidRequest() throws Exception {
        RegisterRequest invalid = new RegisterRequest();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_shouldReturn200_whenValidCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class), any())).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("customer_session=jwt-token"),
                        org.hamcrest.Matchers.containsString("HttpOnly"),
                        org.hamcrest.Matchers.containsString("SameSite=Strict"),
                        org.hamcrest.Matchers.containsString("Secure"))))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void login_shouldReturn401WithGenericMessage_whenBadCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class), any()))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void login_shouldReturn429WithRetryAfter_whenAccountIsLockedOut() throws Exception {
        when(authService.login(any(LoginRequest.class), any()))
                .thenThrow(new com.enesucar.auth_service.exception.TooManyLoginAttemptsException(600));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "600"));
    }

    @Test
    void login_shouldReturn500WithoutLeakingDetails_whenUnexpectedErrorOccurs() throws Exception {
        when(authService.login(any(LoginRequest.class), any()))
                .thenThrow(new RuntimeException("jdbc:postgresql://secret-host connection refused"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Unexpected error"));
    }

    @Test
    void logout_shouldExpireTheCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("customer_session=;"),
                        org.hamcrest.Matchers.containsString("Max-Age=0"),
                        org.hamcrest.Matchers.containsString("HttpOnly"))));
    }

    // ---- change password ----

    @org.junit.jupiter.api.Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser")
    void changePassword_shouldReturn204_whenValid() throws Exception {
        mockMvc.perform(post("/api/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"newPassword456\"}"))
                .andExpect(status().isNoContent());
        org.mockito.Mockito.verify(authService).changePassword(org.mockito.ArgumentMatchers.eq("testuser"), any());
    }

    @org.junit.jupiter.api.Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser")
    void changePassword_shouldReturn400_whenCurrentPasswordWrong() throws Exception {
        org.mockito.Mockito.doThrow(new com.enesucar.auth_service.exception.InvalidPasswordException("Current password is incorrect"))
                .when(authService).changePassword(org.mockito.ArgumentMatchers.eq("testuser"), any());

        mockMvc.perform(post("/api/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"nope\",\"newPassword\":\"newPassword456\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));
    }

    @org.junit.jupiter.api.Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser")
    void changePassword_shouldReturn400_whenNewPasswordTooShort() throws Exception {
        mockMvc.perform(post("/api/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(authService);
    }

    @org.junit.jupiter.api.Test
    void changePassword_shouldReturn401_whenNotSignedIn() throws Exception {
        mockMvc.perform(post("/api/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"newPassword456\"}"))
                .andExpect(status().isUnauthorized());
        org.mockito.Mockito.verifyNoInteractions(authService);
    }

    // ---- session check (used by the gateway to detect revoked tokens) ----

    @org.junit.jupiter.api.Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser", roles = "ADMIN")
    void session_shouldReturnUserAndRole_whenSignedIn() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @org.junit.jupiter.api.Test
    void session_shouldReturn401_whenNotSignedIn() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/session"))
                .andExpect(status().isUnauthorized());
    }
}
