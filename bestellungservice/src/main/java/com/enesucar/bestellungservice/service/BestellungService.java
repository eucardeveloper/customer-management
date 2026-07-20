package com.enesucar.bestellungservice.service;

import com.enesucar.bestellungservice.dto.BestellungRequestDTO;
import com.enesucar.bestellungservice.dto.BestellungResponseDTO;
import com.enesucar.bestellungservice.entity.Bestellung;
import com.enesucar.bestellungservice.kafka.BestellungProducer;
import com.enesucar.bestellungservice.repository.BestellungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BestellungService {

    private final BestellungRepository bestellungRepository;
    private final BestellungProducer bestellungProducer;

    @Transactional
    public BestellungResponseDTO bestellungEkle(BestellungRequestDTO request) {
        Bestellung bestellung = new Bestellung();
        bestellung.setKundeId(request.getKundeId());
        bestellung.setUrunAdi(request.getUrunAdi());
        bestellung.setMiktar(request.getMiktar());
        bestellung.setFiyat(request.getFiyat());
        bestellung.setTarih(LocalDateTime.now());
        Bestellung kaydedilen = bestellungRepository.save(bestellung);

        String mesaj = "Sipariş oluştu: kundeId=" + request.getKundeId()
                + ", urunAdi=" + request.getUrunAdi()
                + ", fiyat=" + request.getFiyat();
        bestellungProducer.bestellungGönder(mesaj);

        return toResponse(kaydedilen);
    }

    public List<BestellungResponseDTO> alleBestellungen() {
        return bestellungRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public BestellungResponseDTO bestellungById(Long id) {
        Bestellung bestellung = bestellungRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sipariş bulunamadı: " + id));
        return toResponse(bestellung);
    }

    public List<BestellungResponseDTO> bestellungByKundeId(Long kundeId) {
        return bestellungRepository.findByKundeId(kundeId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void bestellungDelete(Long id) {
        if (!bestellungRepository.existsById(id)) {
            throw new RuntimeException("Sipariş bulunamadı: " + id);
        }
        bestellungRepository.deleteById(id);
    }

    private BestellungResponseDTO toResponse(Bestellung bestellung) {
        BestellungResponseDTO response = new BestellungResponseDTO();
        response.setId(bestellung.getId());
        response.setKundeId(bestellung.getKundeId());
        response.setUrunAdi(bestellung.getUrunAdi());
        response.setMiktar(bestellung.getMiktar());
        response.setFiyat(bestellung.getFiyat());
        response.setTarih(bestellung.getTarih());
        return response;
    }
}