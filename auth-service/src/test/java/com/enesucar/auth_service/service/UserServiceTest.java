package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.UserResponse;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.exception.InvalidRoleException;
import com.enesucar.auth_service.exception.LastAdminException;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@test.com")
                .password("encodedPassword")
                .role(Role.USER)
                .build();
    }

    @Test
    void getAllUsers_shouldReturnUserList() {
        when(userRepository.findAll()).thenReturn(List.of(user));

        List<UserResponse> result = userService.getAllUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUsername()).isEqualTo("testuser");
        assertThat(result.get(0).getEmail()).isEqualTo("test@test.com");
        assertThat(result.get(0).getRole()).isEqualTo(Role.USER);
    }

    @Test
    void getAllUsers_shouldReturnEmptyList_whenNoUsers() {
        when(userRepository.findAll()).thenReturn(List.of());

        List<UserResponse> result = userService.getAllUsers();

        assertThat(result).isEmpty();
    }

    @Test
    void deleteUser_shouldCallRepositoryDeleteById() {
        doNothing().when(userRepository).deleteById(1L);

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    void updateRole_shouldChangeRoleAndReturnUpdatedUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse result = userService.updateRole(1L, "ADMIN");

        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(user);
    }

    @Test
    void updateRole_shouldRefuseDemotingTheLastAdmin() {
        user.setRole(Role.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.lockAdminIds()).thenReturn(List.of(1L));

        assertThatThrownBy(() -> userService.updateRole(1L, "USER")).isInstanceOf(LastAdminException.class);

        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateRole_shouldAllowDemotingAnAdmin_whenAnotherAdminExists() {
        user.setRole(Role.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.lockAdminIds()).thenReturn(List.of(1L, 2L));
        when(userRepository.save(any(User.class))).thenReturn(user);

        userService.updateRole(1L, "USER");

        assertThat(user.getRole()).isEqualTo(Role.USER);
    }

    @Test
    void deleteUser_shouldRefuseDeletingTheLastAdmin() {
        when(userRepository.lockAdminIds()).thenReturn(List.of(1L));

        assertThatThrownBy(() -> userService.deleteUser(1L)).isInstanceOf(LastAdminException.class);

        verify(userRepository, never()).deleteById(anyLong());
    }

    @Test
    void deleteUser_shouldAllowDeletingAnAdmin_whenAnotherAdminExists() {
        when(userRepository.lockAdminIds()).thenReturn(List.of(1L, 2L));

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    void createUser_shouldKeepTheChosenRole_andHashThePassword() {
        when(passwordEncoder.encode("Secret-123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse result = userService.createUser(createRequest("newadmin", "new@test.com", "admin"));

        assertThat(result.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(argThat(u -> u.getRole() == Role.ADMIN && "hashed".equals(u.getPassword())));
    }

    @Test
    void createUser_shouldRefuseTakenUsernameOrEmail_andUnknownRole() {
        when(userRepository.existsByUsername("taken")).thenReturn(true);
        when(userRepository.existsByEmail("taken@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser(createRequest("taken", "x@test.com", "USER")))
                .isInstanceOf(com.enesucar.auth_service.exception.UserAlreadyExistsException.class)
                .hasMessageStartingWith("Username already taken");
        assertThatThrownBy(() -> userService.createUser(createRequest("free", "taken@test.com", "USER")))
                .isInstanceOf(com.enesucar.auth_service.exception.UserAlreadyExistsException.class)
                .hasMessageStartingWith("Email already registered");
        assertThatThrownBy(() -> userService.createUser(createRequest("free", "x@test.com", "ROOT")))
                .isInstanceOf(InvalidRoleException.class);
        verify(userRepository, never()).save(any(User.class));
    }

    private static com.enesucar.auth_service.dto.CreateUserRequest createRequest(String username, String email, String role) {
        var r = new com.enesucar.auth_service.dto.CreateUserRequest();
        r.setUsername(username);
        r.setEmail(email);
        r.setPassword("Secret-123");
        r.setRole(role);
        return r;
    }

    @Test
    void updateRole_shouldThrowException_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateRole(99L, "ADMIN"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User not found");

        verify(userRepository, never()).save(any());
    }

    @Test
    void updateRole_shouldRejectUnknownAndMissingRoles_withoutTouchingTheUser() {
        assertThatThrownBy(() -> userService.updateRole(1L, "SUPERUSER"))
                .isInstanceOf(InvalidRoleException.class);
        assertThatThrownBy(() -> userService.updateRole(1L, null))
                .isInstanceOf(InvalidRoleException.class);
        assertThatThrownBy(() -> userService.updateRole(1L, "  "))
                .isInstanceOf(InvalidRoleException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_shouldStoreEncodedPassword() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("brandNew123")).thenReturn("hashed");

        userService.resetPassword(1L, "brandNew123");

        assertThat(user.getPassword()).isEqualTo("hashed");
        verify(userRepository).save(user);
    }

    @Test
    void resetPassword_shouldThrowNotFound_whenUserMissing() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.resetPassword(99L, "brandNew123"))
                .isInstanceOf(com.enesucar.auth_service.exception.UserNotFoundException.class);
    }

    @Test
    void resetPassword_shouldInvalidateExistingSessions() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("brandNew123")).thenReturn("hash");

        userService.resetPassword(1L, "brandNew123");

        assertThat(user.getTokenVersion()).isEqualTo(1);
    }

    @Test
    void updateRole_shouldInvalidateExistingSessions() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        userService.updateRole(1L, "ADMIN");

        assertThat(user.getTokenVersion()).isEqualTo(1);
    }
}
