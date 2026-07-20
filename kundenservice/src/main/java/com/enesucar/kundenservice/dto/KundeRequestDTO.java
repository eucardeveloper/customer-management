package com.enesucar.kundenservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class KundeRequestDTO {

    @NotBlank(message = "Ad boş olamaz")
    private String ad;

    @NotBlank(message = "Soyad boş olamaz")
    private String soyad;

    @Email(message = "Geçerli bir email girin")
    @NotBlank(message = "Email boş olamaz")
    private String email;

    private String telefon;
}