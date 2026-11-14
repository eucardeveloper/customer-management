package com.enesucar.customerservice.controller;

import com.enesucar.customerservice.kafka.DeadLetterReplayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Sends dead-lettered order events back for another try. ADMIN only (every POST under /api/customers is, see SecurityConfig). */
@RestController
@RequestMapping("/api/customers/dlt")
public class DeadLetterController {

    private final DeadLetterReplayService replay;

    public DeadLetterController(DeadLetterReplayService replay) {
        this.replay = replay;
    }

    @PostMapping("/replay")
    public ResponseEntity<Map<String, Integer>> replay() {
        return ResponseEntity.ok(Map.of("replayed", replay.replay()));
    }
}
