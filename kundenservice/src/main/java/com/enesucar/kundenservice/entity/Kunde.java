package com.enesucar.kundenservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Entity
@Table(name = "kunden")
public class Kunde {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Ad boş olamaz")
    @Column(nullable = false)
    private String ad;

    @NotBlank(message = "Soyad boş olamaz")
    @Column(nullable = false)
    private String soyad;

    @Email(message = "Geçerli bir email girin")
    @NotBlank(message = "Email boş olamaz")
    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String telefon;
}