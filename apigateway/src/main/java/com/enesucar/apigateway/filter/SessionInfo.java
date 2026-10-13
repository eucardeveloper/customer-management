package com.enesucar.apigateway.filter;

/** Identity the auth-service confirms for a token that is still valid. */
public record SessionInfo(String username, String role) {}
