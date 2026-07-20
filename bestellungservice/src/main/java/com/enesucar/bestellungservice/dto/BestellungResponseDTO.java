package com.enesucar.bestellungservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BestellungResponseDTO {

    private Long id;
    private Long kundeId;
    private String urunAdi;
    private Integer miktar;
    private Double fiyat;
    private LocalDateTime tarih;
}