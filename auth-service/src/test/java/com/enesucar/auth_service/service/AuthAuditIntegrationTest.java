package com.enesucar.auth_service.service;

import com.enesucar.auth_service.entity.AuthAudit;
import com.enesucar.auth_service.entity.Role;
import com.enesucar.auth_service.entity.User;
import com.enesucar.auth_service.repository.AuthAuditRepository;
import com.enesucar.auth_service.repository.LoginFailureRepository;
import com.enesucar.auth_service.repository.UserRepository;
import com.enesucar.auth_service.security.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every account event leaves an audit row: who did it, to whom, and what kind of event. Runs the real
 * controllers, services and database layer (H2); only the HTTP client is simulated.
 */
@SpringBootTest
class AuthAuditIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired AuthAuditRepository audits;
    @Autowired LoginFailureRepository loginFailures;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtUtil jwtUtil;

    MockMvc mvc;
    String adminName;
    String adminPassword;
    User admin;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        adminName = "adm" + shortId();
        adminPassword = "Pw-" + UUID.randomUUID();
        admin = users.save(User.builder().username(adminName).email(adminName + "@example.com")
                .password(encoder.encode(adminPassword)).role(Role.ADMIN).build());
    }

    /** Failed sign-ins are counted in a table other tests count rows in; leave it as we found it. */
    @AfterEach
    void leaveNoLoginFailuresBehind() {
        loginFailures.deleteAll();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String bearer(User u) {
        return "Bearer " + jwtUtil.generateToken(u.getUsername(), u.getRole().name(), u.getTokenVersion(), u.getId());
    }

    private List<AuthAudit> rowsAbout(String target) {
        return audits.findByTargetOrderByIdDesc(target, org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
    }

    private static String json(String... kv) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < kv.length; i += 2) {
            sb.append(i > 0 ? "," : "").append('"').append(kv[i]).append("\":\"").append(kv[i + 1]).append('"');
        }
        return sb.append('}').toString();
    }

    @Test
    void adminActionsAreRecordedWithActorAndTarget() throws Exception {
        String newUser = "usr" + shortId();
        String newPassword = "Np-" + UUID.randomUUID();

        mvc.perform(post("/api/users").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(json("username", newUser, "email", newUser + "@example.com", "password", newPassword, "role", "USER")))
                .andExpect(status().isCreated());
        User created = users.findByUsername(newUser).orElseThrow();

        mvc.perform(patch("/api/users/" + created.getId() + "/role").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(json("role", "ADMIN")))
                .andExpect(status().isOk());
        mvc.perform(put("/api/users/" + created.getId() + "/password").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(json("newPassword", "Reset-" + UUID.randomUUID())))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/users/" + created.getId()).header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());

        List<AuthAudit> rows = rowsAbout(newUser); // newest first
        assertThat(rows).extracting(AuthAudit::getAction)
                .containsExactly("USER_DELETED", "PASSWORD_RESET", "ROLE_CHANGED", "USER_CREATED");
        assertThat(rows).allSatisfy(r -> assertThat(r.getActor()).isEqualTo(adminName));
        assertThat(rows.get(2).getDetails()).isEqualTo("USER -> ADMIN");
    }

    @Test
    void signInAndFailedSignInAreRecordedAndNeverContainThePassword() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("username", adminName, "password", adminPassword)))
                .andExpect(status().isOk());
        String wrongPassword = "Wrong-" + UUID.randomUUID();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("username", adminName, "password", wrongPassword)))
                .andExpect(status().isUnauthorized());

        List<AuthAudit> rows = rowsAbout(adminName);
        assertThat(rows).extracting(AuthAudit::getAction).containsExactly("LOGIN_FAILED", "LOGIN_SUCCESS");
        assertThat(rows).allSatisfy(r -> {
            String all = String.valueOf(r.getActor()) + r.getTarget() + r.getDetails();
            assertThat(all).doesNotContain(adminPassword).doesNotContain(wrongPassword);
        });
    }

    @Test
    void failedSignInWithControlCharactersInTheNameIsStoredCleaned() throws Exception {
        String probe = "ghost" + shortId();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + probe + "\\r\\nFAKE\",\"password\":\"x-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isUnauthorized());

        List<AuthAudit> rows = rowsAbout(probe + "FAKE");
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getAction()).isEqualTo("LOGIN_FAILED");
        assertThat(rows.get(0).getActor()).doesNotContain("\r").doesNotContain("\n");
    }

    @Test
    void auditApiIsAdminOnly() throws Exception {
        User plain = users.save(User.builder().username("usr" + shortId()).email(shortId() + "@example.com")
                .password(encoder.encode("Pw-" + UUID.randomUUID())).role(Role.USER).build());

        mvc.perform(get("/api/users/audit").header("Authorization", bearer(plain))).andExpect(status().isForbidden());
        mvc.perform(get("/api/users/audit")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/users/audit").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void auditApiCapsThePageSize() throws Exception {
        mvc.perform(get("/api/users/audit?size=100000").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));
    }
}
