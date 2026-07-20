package com.enesucar.kundenservice.service;

import com.enesucar.kundenservice.dto.KundeRequestDTO;
import com.enesucar.kundenservice.dto.KundeResponseDTO;
import com.enesucar.kundenservice.entity.Kunde;
import com.enesucar.kundenservice.repository.KundeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KundeService {

    private final KundeRepository kundeRepository;

    @Transactional
    public KundeResponseDTO kundeEkle(KundeRequestDTO request) {
        if (kundeRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Bu email zaten kayıtlı: " + request.getEmail());
        }
        Kunde kunde = new Kunde();
        kunde.setAd(request.getAd());
        kunde.setSoyad(request.getSoyad());
        kunde.setEmail(request.getEmail());
        kunde.setTelefon(request.getTelefon());
        Kunde kaydedilen = kundeRepository.save(kunde);
        return toResponse(kaydedilen);
    }

    public List<KundeResponseDTO> alleKunden() {
        return kundeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public KundeResponseDTO kundeById(Long id) {
        Kunde kunde = kundeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Müşteri bulunamadı: " + id));
        return toResponse(kunde);
    }

    @Transactional
    public KundeResponseDTO kundeUpdate(Long id, KundeRequestDTO request) {
        Kunde kunde = kundeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Müşteri bulunamadı: " + id));
        kunde.setAd(request.getAd());
        kunde.setSoyad(request.getSoyad());
        kunde.setEmail(request.getEmail());
        kunde.setTelefon(request.getTelefon());
        return toResponse(kundeRepository.save(kunde));
    }

    @Transactional
    public void kundeDelete(Long id) {
        if (!kundeRepository.existsById(id)) {
            throw new RuntimeException("Müşteri bulunamadı: " + id);
        }
        kundeRepository.deleteById(id);
    }

    private KundeResponseDTO toResponse(Kunde kunde) {
        KundeResponseDTO response = new KundeResponseDTO();
        response.setId(kunde.getId());
        response.setAd(kunde.getAd());
        response.setSoyad(kunde.getSoyad());
        response.setEmail(kunde.getEmail());
        response.setTelefon(kunde.getTelefon());
        return response;
    }
}