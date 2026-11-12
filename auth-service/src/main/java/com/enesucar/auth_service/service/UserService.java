package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.CreateUserRequest;
import com.enesucar.auth_service.dto.UserResponse;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.exception.InvalidRoleException;
import com.enesucar.auth_service.exception.LastAdminException;
import com.enesucar.auth_service.exception.UserAlreadyExistsException;
import com.enesucar.auth_service.exception.UserNotFoundException;
import com.enesucar.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthAuditService audit;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserResponse(u.getId(), u.getUsername(), u.getEmail(), u.getRole()))
                .toList();
    }

    /**
     * An administrator adds an account with the chosen role. Unlike public sign-up this issues no session:
     * the admin who calls it stays signed in as themselves.
     */
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        Role role = parseRole(request.getRole());
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }
        User user = userRepository.save(User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .role(role)
                .build());
        audit.record(AuthAuditService.USER_CREATED, AuthAuditService.currentActor(), user.getUsername(),
                "role " + user.getRole());
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void deleteUser(Long id) {
        requireAnotherAdmin(id, userRepository.lockAdminIds());
        userRepository.findById(id).ifPresent(u -> audit.record(AuthAuditService.USER_DELETED,
                AuthAuditService.currentActor(), u.getUsername(), "role " + u.getRole()));
        userRepository.deleteById(id);
    }

    /**
     * Throws when the given user is an ADMIN and no other ADMIN would be left. {@code lockedAdminIds} comes
     * from {@link UserRepository#lockAdminIds()} in the same transaction, so two admins demoting or deleting
     * each other at the same moment cannot both pass this check.
     */
    private static void requireAnotherAdmin(Long id, List<Long> lockedAdminIds) {
        if (lockedAdminIds.contains(id) && lockedAdminIds.size() <= 1) {
            throw new LastAdminException();
        }
    }

    @Transactional
    public UserResponse updateRole(Long id, String role) {
        Role newRole = parseRole(role);
        List<Long> admins = userRepository.lockAdminIds(); // before reading the user, so it is read after any change that held the lock
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if (newRole != Role.ADMIN) {
            requireAnotherAdmin(id, admins);
        }
        Role oldRole = user.getRole();
        user.setRole(newRole);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        audit.record(AuthAuditService.ROLE_CHANGED, AuthAuditService.currentActor(), user.getUsername(),
                oldRole + " -> " + newRole);
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }

    /** Admin sets a new password for a user who forgot theirs. */
    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        audit.record(AuthAuditService.PASSWORD_RESET, AuthAuditService.currentActor(), user.getUsername(),
                "sessions ended");
    }

    private static Role parseRole(String role) {
        if (role == null || role.isBlank()) {
            throw new InvalidRoleException("role is required");
        }
        try {
            return Role.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidRoleException("Unknown role: " + role);
        }
    }
}
