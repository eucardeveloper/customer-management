package com.enesucar.bestellungservice.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String mesaj) {
        super(mesaj);
    }
}