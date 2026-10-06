package com.enesucar.orderservice.controller;

import com.enesucar.orderservice.kafka.OrderProducer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs the real Spring Security chain. The API gateway validates the JWT and injects
 * X-Auth-User / X-Auth-Role; these tests play the gateway by sending (or omitting) those headers.
 * Order and customer services are only reachable through the gateway (their ports are not published).
 */
@SpringBootTest
@ActiveProfiles("test")
class OrderApiAuthorizationTest {

    @MockitoBean OrderProducer orderProducer;

    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;
    @Autowired ObjectMapper json;

    MockMvc mvc;

    private static final String ORDER = "{\"customerId\":1,\"productName\":\"Laptop\",\"price\":999.90,\"quantity\":2}";

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void withoutGatewayHeadersEveryEndpointAnswers401() throws Exception {
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/orders/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(ORDER)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/orders/1").contentType(MediaType.APPLICATION_JSON).content(ORDER)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/orders/1")).andExpect(status().isUnauthorized());
    }

    @Test
    void userRoleCannotChangeOrders() throws Exception {
        mvc.perform(post("/api/orders").header("X-Auth-User", "user1").header("X-Auth-Role", "USER")
                .contentType(MediaType.APPLICATION_JSON).content(ORDER)).andExpect(status().isForbidden());
        mvc.perform(put("/api/orders/1").header("X-Auth-User", "user1").header("X-Auth-Role", "USER")
                .contentType(MediaType.APPLICATION_JSON).content(ORDER)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/orders/1").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());
    }

    @Test
    void priceIsOnlyVisibleToAdmin() throws Exception {
        String created = mvc.perform(post("/api/orders").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON).content(ORDER))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(created).get("id").asLong();

        String asAdmin = mvc.perform(get("/api/orders/" + id).header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(asAdmin).hasNonNull("price")).isTrue();

        String asUser = mvc.perform(get("/api/orders/" + id).header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(asUser).hasNonNull("price")).isFalse();

        String list = mvc.perform(get("/api/orders").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        for (JsonNode order : json.readTree(list)) {
            assertThat(order.hasNonNull("price")).isFalse();
        }
    }
}
