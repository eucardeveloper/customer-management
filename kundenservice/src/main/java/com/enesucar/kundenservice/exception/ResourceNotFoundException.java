package com.enesucar.kundenservice.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String mesaj) {
        super(mesaj);
    }
}