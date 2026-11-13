package com.enesucar.auth_service.service;

import com.enesucar.auth_service.dto.CreateUserRequest;
import com.enesucar.auth_service.dto.RegisterRequest;
import com.enesucar.auth_service.exception.UserAlreadyExistsException;
import com.enesucar.auth_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Database-level guarantees, on a real PostgreSQL with the real migrations: e-mail addresses are unique
 * regardless of case (V8), and the application's runtime role can append to the audit trail but not
 * change or delete it (V9). Needs Docker; fails with a clear error when it is not running.
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.target=latest"
})
class AuthPostgresConstraintsIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired AuthService authService;
    @Autowired UserService userService;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void theSameEmailInAnotherLetterCaseIsAlreadyRegistered() {
        String id = shortId();
        RegisterRequest first = new RegisterRequest();
        first.setUsername("first" + id);
        first.setEmail("Case." + id + "@Example.com");
        first.setPassword("a-long-enough-password");
        authService.register(first);

        CreateUserRequest second = new CreateUserRequest();
        second.setUsername("second" + id);
        second.setEmail("case." + id + "@example.COM");
        second.setPassword("a-long-enough-password");
        second.setRole("USER");

        assertThatThrownBy(() -> userService.createUser(second))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageStartingWith("Email already registered");
        assertThat(users.findByUsername("second" + id)).isEmpty();
    }

    @Test
    void theIndexRejectsAnInsertThatSkipsTheServiceCheck() {
        String id = shortId();
        jdbc.update("INSERT INTO users (username, password, email, role) VALUES (?, 'x', ?, 'USER')", "raw1" + id, "Raw." + id + "@x.com");

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO users (username, password, email, role) VALUES (?, 'x', ?, 'USER')", "raw2" + id, "raw." + id + "@X.COM"))
                .hasMessageContaining("uq_users_email_lower");
    }

    @Test
    void theRuntimeRoleCanAppendToTheAuditTrailButNotChangeOrDeleteIt() throws Exception {
        String rolePassword = UUID.randomUUID().toString();
        jdbc.execute("CREATE ROLE auth_app LOGIN PASSWORD '" + rolePassword + "'");
        // what the init script and the default privileges give the runtime role before V9 takes the rights away
        jdbc.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO auth_app");
        jdbc.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO auth_app");
        jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V9__auth_audit_append_only.sql")));

        try (Connection app = DriverManager.getConnection(POSTGRES.getJdbcUrl(), "auth_app", rolePassword);
             Statement st = app.createStatement()) {
            st.executeUpdate("INSERT INTO auth_audit (action, actor, created_at) VALUES ('X', 'me', now())");
            assertThat(st.executeQuery("SELECT count(*) FROM auth_audit").next()).isTrue();
            assertThatThrownBy(() -> st.executeUpdate("UPDATE auth_audit SET actor = 'someone else'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("permission denied");
            assertThatThrownBy(() -> st.executeUpdate("DELETE FROM auth_audit"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("permission denied");
            // other tables keep their normal rights
            st.executeUpdate("DELETE FROM revoked_token");
        }
    }
}
