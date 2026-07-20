package com.enesucar.kundenservice.controller;

import com.enesucar.kundenservice.dto.KundeRequestDTO;
import com.enesucar.kundenservice.dto.KundeResponseDTO;
import com.enesucar.kundenservice.service.KundeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kunden")
@RequiredArgsConstructor
public class KundeController {

    private final KundeService kundeService;

    @PostMapping
    public ResponseEntity<KundeResponseDTO> ekle(@Valid @RequestBody KundeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(kundeService.kundeEkle(request));
    }

    @GetMapping
    public ResponseEntity<List<KundeResponseDTO>> alleKunden() {
        return ResponseEntity.ok(kundeService.alleKunden());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KundeResponseDTO> kundeById(@PathVariable Long id) {
        return ResponseEntity.ok(kundeService.kundeById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KundeResponseDTO> update(@PathVariable Long id, @Valid @RequestBody KundeRequestDTO request) {
        return ResponseEntity.ok(kundeService.kundeUpdate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kundeService.kundeDelete(id);
        return ResponseEntity.noContent().build();
    }
}