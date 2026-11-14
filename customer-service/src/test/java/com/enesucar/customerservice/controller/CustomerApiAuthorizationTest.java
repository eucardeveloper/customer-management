package com.enesucar.customerservice.controller;

import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs the real Spring Security chain; the test plays the API gateway by sending (or omitting) the
 * X-Auth-User / X-Auth-Role headers the gateway injects after validating the JWT.
 */
@SpringBootTest
class CustomerApiAuthorizationTest {

    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;

    MockMvc mvc;

    private static final String CUSTOMER = "{\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"email\":\"ada@example.com\"}";

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void withoutGatewayHeadersEveryEndpointAnswers401() throws Exception {
        mvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/customers/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/customers").contentType(MediaType.APPLICATION_JSON).content(CUSTOMER)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/customers/1").contentType(MediaType.APPLICATION_JSON).content(CUSTOMER)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/customers/1")).andExpect(status().isUnauthorized());
    }

    @Test
    void userRoleCanReadButNotChange() throws Exception {
        mvc.perform(get("/api/customers").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/customers").header("X-Auth-User", "user1").header("X-Auth-Role", "USER")
                .contentType(MediaType.APPLICATION_JSON).content(CUSTOMER)).andExpect(status().isForbidden());
        mvc.perform(put("/api/customers/1").header("X-Auth-User", "user1").header("X-Auth-Role", "USER")
                .contentType(MediaType.APPLICATION_JSON).content(CUSTOMER)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/customers/1").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());
    }
    @Test
    void auditTrailIsAdminOnly() throws Exception {
        mvc.perform(get("/api/customers/audit")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/customers/audit").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/customers/audit/anything").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/customers/audit").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk());
    }

    private static final String ADMIN_ROLE = "ADMIN";

    @Test
    void auditCanBeFilteredByActorActionAndDate() throws Exception {
        String email = "filter-" + java.util.UUID.randomUUID() + "@example.com";
        String body = "{\"firstName\":\"Fil\",\"lastName\":\"Ter\",\"email\":\"" + email + "\"}";
        String created = mvc.perform(post("/api/customers").header("X-Auth-User", "filter-alice").header("X-Auth-Role", ADMIN_ROLE)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = created.replaceAll("(?s).*\"id\"\\s*:\\s*(\\d+).*", "$1");
        mvc.perform(put("/api/customers/" + id).header("X-Auth-User", "filter-bob").header("X-Auth-Role", ADMIN_ROLE)
                .contentType(MediaType.APPLICATION_JSON).content(body.replace("Fil", "Fil2"))).andExpect(status().isOk());

        // actor: case-insensitive "contains"; only that actor's rows come back
        mvc.perform(audit("actor", "FILTER-AL"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.items[?(@.actor != 'filter-alice')]").isEmpty());
        // action: exact; filters combine
        mvc.perform(audit("action", "UPDATED", "actor", "filter-bob"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(1));
        mvc.perform(audit("action", "CREATED", "actor", "filter-bob"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(0));
        mvc.perform(audit("customerId", id, "action", "CREATED"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(1));
        // dates are inclusive whole days
        String today = java.time.LocalDate.now().toString();
        mvc.perform(audit("from", today, "to", today, "actor", "filter-alice"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
        mvc.perform(audit("from", "2000-01-01", "to", "2000-01-02"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.total").value(0));
    }

    @Test
    void auditFilterRejectsBadDatesWith400() throws Exception {
        mvc.perform(audit("from", "not-a-date")).andExpect(status().isBadRequest());
        mvc.perform(audit("from", "2026-02-02", "to", "2026-02-01")).andExpect(status().isBadRequest());
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder audit(String... params) {
        var req = get("/api/customers/audit").header("X-Auth-User", "admin").header("X-Auth-Role", ADMIN_ROLE);
        for (int i = 0; i < params.length; i += 2) req = req.param(params[i], params[i + 1]);
        return req;
    }
}
