package com.enesucar.customerservice.client;

import com.enesucar.customerservice.exception.OrderServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Asks the order-service whether a customer has orders. The two services have separate databases, so
 * this question cannot be a foreign key; it is a synchronous call made at the moment of the change.
 * The caller's identity is passed on in the same headers the gateway uses (the services are only
 * reachable through the gateway), so the order-service applies its normal rules.
 */
@Component
public class OrderClient {

    private final RestClient client;

    public OrderClient(@Value("${order.service.url:http://order-backend:8082}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(3));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public boolean hasOrders(Long customerId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth != null ? auth.getName() : "unknown";
        String role = auth == null ? "USER" : auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", "")).findFirst().orElse("USER");
        try {
            List<Map<String, Object>> orders = client.get()
                    .uri("/api/orders/customer/{id}", customerId)
                    .header("X-Auth-User", user)
                    .header("X-Auth-Role", role)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return orders != null && !orders.isEmpty();
        } catch (Exception e) {
            throw new OrderServiceUnavailableException(e);
        }
    }
}
