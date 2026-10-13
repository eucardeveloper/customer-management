package com.enesucar.orderservice.client;

import com.enesucar.orderservice.exception.CustomerServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Asks the customer-service whether a customer exists (the databases are separate, so there is no
 * foreign key). The caller's identity is passed on in the headers the gateway sets.
 */
@Component
public class CustomerClient {

    private final RestClient client;

    public CustomerClient(@Value("${customer.service.url:http://customer-backend:8081}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(3));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public boolean exists(Long customerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth != null ? auth.getName() : "unknown";
        String role = auth == null ? "USER" : auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("USER");
        try {
            client.get().uri("/api/customers/{id}", customerId)
                    .header("X-Auth-User", user)
                    .header("X-Auth-Role", role)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (HttpClientErrorException.NotFound e) {
            return false;
        } catch (Exception e) {
            throw new CustomerServiceUnavailableException(e);
        }
    }
}
