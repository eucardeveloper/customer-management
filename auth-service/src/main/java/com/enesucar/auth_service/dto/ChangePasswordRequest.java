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

    // BCrypt refuses more than 72 BYTES (not characters), so the limit is counted in bytes.
    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "New password must be at least 8 characters")
    @Utf8MaxBytes(message = "New password must be at most 72 bytes (accented letters count as 2)")
    private String newPassword;
}
