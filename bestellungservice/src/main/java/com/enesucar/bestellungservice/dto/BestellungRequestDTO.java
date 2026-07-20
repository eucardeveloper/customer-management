package com.enesucar.bestellungservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BestellungRequestDTO {

    @NotNull(message = "Müşteri id boş olamaz")
    private Long kundeId;

    @NotBlank(message = "Ürün adı boş olamaz")
    private String urunAdi;

    @NotNull(message = "Miktar boş olamaz")
    @Min(value = 1, message = "Miktar en az 1 olmalı")
    private Integer miktar;

    @NotNull(message = "Fiyat boş olamaz")
    private Double fiyat;
}