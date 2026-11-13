package com.enesucar.customerservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerRequestDTO {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be at most 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must be at most 100 characters")
    private String lastName;

    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String email;

    @Size(max = 20, message = "Phone must be at most 20 characters")
    @Pattern(regexp = "^[+0-9 ()-]*$", message = "Phone may contain only digits, +, spaces, - and parentheses")
    private String phone;

    @Pattern(regexp = "^(INDIVIDUAL|COMPANY)$", message = "Customer type must be INDIVIDUAL or COMPANY")
    private String customerType;

    /**
     * Optional: the version of the record the caller based its edit on (from the last response). When it is
     * sent and the record has moved on, the update answers 409 instead of silently overwriting. Without it
     * the update behaves as before.
     */
    private Long version;

    /**
     * A customer needs at least one way to be reached. The screen already enforces this; the API must too,
     * otherwise a direct call can create a customer nobody can contact.
     */
    @JsonIgnore
    @AssertTrue(message = "Email or phone is required")
    public boolean isContactProvided() {
        return (email != null && !email.isBlank()) || (phone != null && !phone.isBlank());
    }
}
