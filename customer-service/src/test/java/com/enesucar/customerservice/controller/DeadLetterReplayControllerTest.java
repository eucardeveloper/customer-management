package com.enesucar.customerservice.controller;

import com.enesucar.customerservice.exception.ReplayInProgressException;
import com.enesucar.customerservice.exception.ReplayUnavailableException;
import com.enesucar.customerservice.kafka.DeadLetterReplayService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Replaying the dead-letter topic is an ADMIN action; the answer says how many events were sent back. */
@SpringBootTest
class DeadLetterReplayControllerTest {

    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;
    @MockitoBean DeadLetterReplayService replay;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
    }

    @Test
    void onlyAnAdminMayReplay() throws Exception {
        mvc.perform(post("/api/customers/dlt/replay")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/customers/dlt/replay").header("X-Auth-User", "user1").header("X-Auth-Role", "USER"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminGetsTheNumberOfReplayedEvents() throws Exception {
        when(replay.replay()).thenReturn(3);
        mvc.perform(post("/api/customers/dlt/replay").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(3));
    }

    @Test
    void aSecondReplayAtTheSameTimeAnswers409() throws Exception {
        when(replay.replay()).thenThrow(new ReplayInProgressException());
        mvc.perform(post("/api/customers/dlt/replay").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isConflict());
    }

    @Test
    void aBrokerThatCannotBeReachedAnswers503() throws Exception {
        when(replay.replay()).thenThrow(new ReplayUnavailableException("broker not reachable", new RuntimeException("x")));
        mvc.perform(post("/api/customers/dlt/replay").header("X-Auth-User", "admin").header("X-Auth-Role", "ADMIN"))
                .andExpect(status().isServiceUnavailable());
    }
}
