package com.enesucar.orderservice.controller;

import com.enesucar.orderservice.client.CustomerClient;
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
    @MockitoBean CustomerClient customerClient; // the customer-service is not running in this test

    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;
    // Spring Boot 4 auto-configures Jackson 3; this test only parses JSON, so a plain mapper is enough.
    private final ObjectMapper json = new ObjectMapper();

    MockMvc mvc;

    private static final String ORDER = "{\"customerId\":1,\"productName\":\"Laptop\",\"price\":999.90,\"quantity\":2}";

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.when(customerClient.exists(org.mockito.ArgumentMatchers.any())).thenReturn(true);
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

    @Test
    void auditTrailIsAdminOnlyAndShowsWhoChangedWhat() throws Exception {
        mvc.perform(get("/api/orders/audit")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/orders/audit").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());

        String created = mvc.perform(post("/api/orders").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON).content(ORDER))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(created).get("id").asLong();

        String body = mvc.perform(get("/api/orders/audit").param("orderId", String.valueOf(id))
                        .header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode page = json.readTree(body);
        assertThat(page.get("total").asLong()).isEqualTo(1);
        JsonNode row = page.get("items").get(0);
        assertThat(row.get("action").asText()).isEqualTo("CREATE");
        assertThat(row.get("actor").asText()).isEqualTo("admin");
        assertThat(row.get("orderId").asLong()).isEqualTo(id);
    }

    @Test
    void auditPagingIsClampedAndNewestFirst() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/orders").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN")
                    .contentType(MediaType.APPLICATION_JSON).content(ORDER)).andExpect(status().isCreated());
        }
        String body = mvc.perform(get("/api/orders/audit").param("page", "-5").param("size", "2")
                        .header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode page = json.readTree(body);
        assertThat(page.get("page").asInt()).isEqualTo(0);
        assertThat(page.get("size").asInt()).isEqualTo(2);
        assertThat(page.get("items")).hasSize(2);
        assertThat(page.get("items").get(0).get("id").asLong()).isGreaterThan(page.get("items").get(1).get("id").asLong());
        assertThat(page.get("total").asLong()).isGreaterThanOrEqualTo(3);

        String huge = mvc.perform(get("/api/orders/audit").param("size", "100000")
                        .header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(huge).get("size").asInt()).isEqualTo(100);
    }

    private long createAs(String user) throws Exception {
        String created = mvc.perform(post("/api/orders").header("X-Auth-User", user).header("X-Auth-Role", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON).content(ORDER))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(created).get("id").asLong();
    }

    private JsonNode auditPage(String... params) throws Exception {
        var req = get("/api/orders/audit").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN");
        for (int i = 0; i < params.length; i += 2) req = req.param(params[i], params[i + 1]);
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    @Test
    void auditCanBeFilteredByActorActionAndDate() throws Exception {
        long id = createAs("filter-alice");
        mvc.perform(put("/api/orders/" + id).header("X-Auth-User", "filter-bob").header("X-Auth-Role", "ADMIN")
                .contentType(MediaType.APPLICATION_JSON).content(ORDER.replace("Laptop", "Laptop 2"))).andExpect(status().isOk());

        // actor: case-insensitive "contains", and only that actor's rows come back
        JsonNode byActor = auditPage("actor", "FILTER-AL");
        assertThat(byActor.get("total").asLong()).isGreaterThanOrEqualTo(1);
        byActor.get("items").forEach(r -> assertThat(r.get("actor").asText()).isEqualTo("filter-alice"));

        // action: exact match
        JsonNode updates = auditPage("action", "UPDATE", "actor", "filter-bob");
        assertThat(updates.get("total").asLong()).isEqualTo(1);
        assertThat(updates.get("items").get(0).get("action").asText()).isEqualTo("UPDATE");
        assertThat(auditPage("action", "CREATE", "actor", "filter-bob").get("total").asLong()).isZero();

        // filters combine with orderId
        assertThat(auditPage("orderId", String.valueOf(id), "action", "CREATE").get("total").asLong()).isEqualTo(1);

        // dates are inclusive whole days
        String today = java.time.LocalDate.now().toString();
        assertThat(auditPage("from", today, "to", today, "actor", "filter-alice").get("total").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(auditPage("from", "2000-01-01", "to", "2000-01-02").get("total").asLong()).isZero();
    }

    @Test
    void auditFilterRejectsBadDatesWith400() throws Exception {
        mvc.perform(get("/api/orders/audit").param("from", "not-a-date").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders/audit").param("from", "2026-02-02").param("to", "2026-02-01")
                        .header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isBadRequest());
    }
}
