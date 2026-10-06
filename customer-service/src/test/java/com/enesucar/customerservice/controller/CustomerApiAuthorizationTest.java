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
}
