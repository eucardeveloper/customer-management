package com.enesucar.bestellungservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "bestellungen")
public class Bestellung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Müşteri id boş olamaz")
    @Column(nullable = false)
    private Long kundeId;

    @NotBlank(message = "Ürün adı boş olamaz")
    @Column(nullable = false)
    private String urunAdi;

    @NotNull(message = "Miktar boş olamaz")
    @Min(value = 1, message = "Miktar en az 1 olmalı")
    @Column(nullable = false)
    private Integer miktar;

    @NotNull(message = "Fiyat boş olamaz")
    @Column(nullable = false)
    private Double fiyat;

    @Column
    private LocalDateTime tarih;
}