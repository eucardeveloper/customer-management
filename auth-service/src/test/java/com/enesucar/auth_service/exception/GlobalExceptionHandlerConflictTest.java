package com.enesucar.auth_service.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** A constraint violation is described by what actually collided, never by a guess that names the wrong field. */
class GlobalExceptionHandlerConflictTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private static DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("could not execute statement",
                new RuntimeException("ERROR: duplicate key value violates unique constraint \"" + constraint + "\""));
    }

    private String message(DataIntegrityViolationException ex) {
        ResponseEntity<Map<String, Object>> response = handler.handleDuplicate(ex);
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        return String.valueOf(response.getBody().get("message"));
    }

    @Test
    void aTakenEmailIsReportedAsAnEmail() {
        assertThat(message(violation("users_email_key"))).containsIgnoringCase("email").doesNotContainIgnoringCase("username");
    }

    @Test
    void aTakenUsernameIsReportedAsAUsername() {
        assertThat(message(violation("users_username_key"))).containsIgnoringCase("username").doesNotContainIgnoringCase("email");
    }

    @Test
    void anUnknownConstraintGetsANeutralSentenceThatNamesNothing() {
        assertThat(message(violation("some_other_constraint")))
                .doesNotContainIgnoringCase("username").doesNotContainIgnoringCase("email").doesNotContain("some_other_constraint");
    }
}
