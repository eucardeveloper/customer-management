package com.enesucar.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    // BCrypt only uses the first 72 bytes, so longer input would silently be truncated.
    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 72, message = "New password must be 8-72 characters")
    private String newPassword;
}
