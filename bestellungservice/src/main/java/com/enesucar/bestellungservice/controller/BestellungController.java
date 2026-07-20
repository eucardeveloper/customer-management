package com.enesucar.bestellungservice.controller;

import com.enesucar.bestellungservice.dto.BestellungRequestDTO;
import com.enesucar.bestellungservice.dto.BestellungResponseDTO;
import com.enesucar.bestellungservice.service.BestellungService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bestellungen")
@RequiredArgsConstructor
public class BestellungController {

    private final BestellungService bestellungService;

    @PostMapping
    public ResponseEntity<BestellungResponseDTO> ekle(@Valid @RequestBody BestellungRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bestellungService.bestellungEkle(request));
    }

    @GetMapping
    public ResponseEntity<List<BestellungResponseDTO>> alleBestellungen() {
        return ResponseEntity.ok(bestellungService.alleBestellungen());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BestellungResponseDTO> bestellungById(@PathVariable Long id) {
        return ResponseEntity.ok(bestellungService.bestellungById(id));
    }

    @GetMapping("/kunde/{kundeId}")
    public ResponseEntity<List<BestellungResponseDTO>> bestellungByKundeId(@PathVariable Long kundeId) {
        return ResponseEntity.ok(bestellungService.bestellungByKundeId(kundeId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bestellungService.bestellungDelete(id);
        return ResponseEntity.noContent().build();
    }
}