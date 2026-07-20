package com.enesucar.kundenservice.dto;

import lombok.Data;

@Data
public class KundeResponseDTO {

    private Long id;
    private String ad;
    private String soyad;
    private String email;
    private String telefon;
}