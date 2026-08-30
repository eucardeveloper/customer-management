package com.enesucar.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    // SECURITY: role is intentionally NOT part of the public registration payload.
    // Public self-registration always yields ROLE_USER. Elevating a user to ADMIN is
    // done exclusively through PATCH /api/users/{id}/role, which is @PreAuthorize("hasRole('ADMIN')").
    // Accepting a client-supplied role here was a privilege-escalation hole.
}
