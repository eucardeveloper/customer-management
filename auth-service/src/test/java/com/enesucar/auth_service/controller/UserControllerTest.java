package com.enesucar.auth_service.controller;

import com.enesucar.auth_service.dto.UserResponse;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class UserControllerTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    // Spring Boot 4 auto-configures Jackson 3; these tests only serialise request bodies, so a plain mapper is enough.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserService userService;

    private UserResponse userResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        userResponse = new UserResponse(1L, "testuser", "test@test.com", Role.USER);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllUsers_shouldReturn200_whenAdmin() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of(userResponse));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("testuser"))
                .andExpect(jsonPath("$[0].email").value("test@test.com"))
                .andExpect(jsonPath("$[0].role").value("USER"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getAllUsers_shouldReturn403_whenNotAdmin() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAllUsers_shouldReturn403_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteUser_shouldReturn204_whenAdmin() throws Exception {
        doNothing().when(userService).deleteUser(1L);

        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isNoContent());

        verify(userService).deleteUser(1L);
    }

    @Test
    @WithMockUser(roles = "USER")
    void deleteUser_shouldReturn403_whenNotAdmin() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateRole_shouldReturn200_whenAdmin() throws Exception {
        UserResponse updatedResponse = new UserResponse(1L, "testuser", "test@test.com", Role.ADMIN);
        when(userService.updateRole(eq(1L), eq("ADMIN"))).thenReturn(updatedResponse);

        mockMvc.perform(patch("/api/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void updateRole_shouldReturn403_whenNotAdmin() throws Exception {
        mockMvc.perform(patch("/api/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "ADMIN"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateRole_shouldReturn500_whenUserNotFound() throws Exception {
        when(userService.updateRole(eq(99L), anyString()))
                .thenThrow(new RuntimeException("User not found"));

        mockMvc.perform(patch("/api/users/99/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "ADMIN"))))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resetPassword_shouldReturn204_whenAdmin() throws Exception {
        mockMvc.perform(put("/api/users/1/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"brandNew123\"}"))
                .andExpect(status().isNoContent());
        verify(userService).resetPassword(1L, "brandNew123");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resetPassword_shouldReturn400_whenTooShort() throws Exception {
        mockMvc.perform(put("/api/users/1/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
        verify(userService, never()).resetPassword(anyLong(), anyString());
    }

    @Test
    @WithMockUser(roles = "USER")
    void resetPassword_shouldReturn403_whenNotAdmin() throws Exception {
        mockMvc.perform(put("/api/users/1/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"brandNew123\"}"))
                .andExpect(status().isForbidden());
    }
}
