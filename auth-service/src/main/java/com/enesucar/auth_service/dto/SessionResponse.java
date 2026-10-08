package com.enesucar.auth_service.dto;

/** What the browser gets back from login/register. The JWT itself travels only in an HttpOnly cookie. */
public record SessionResponse(String username, String role) {}
