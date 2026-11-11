package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.dto.CustomerResponseDTO;
import com.enesucar.customerservice.exception.DuplicateEmailException;
import com.enesucar.customerservice.repository.CustomerAuditRepository;
import com.enesucar.customerservice.repository.CustomerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Customer changes leave an audit row, written in the same transaction as the change, with the actor
 * from the security context. Runs on a real PostgreSQL with the real Flyway migrations (V6 table).
 * A refused change (duplicate e-mail) leaves no row; personal data values never reach the trail.
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true"
})
class CustomerAuditIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @MockitoBean OrderClient orderClient;
    @Autowired CustomerService service;
    @Autowired CustomerRepository customers;
    @Autowired CustomerAuditRepository audits;

    @BeforeEach
    void actAsAdmin() {
        customers.deleteAll();
        audits.deleteAll();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", "n/a", List.of()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static CustomerRequestDTO request(String first, String email, String phone) {
        CustomerRequestDTO r = new CustomerRequestDTO();
        r.setFirstName(first);
        r.setLastName("Audit");
        r.setEmail(email);
        r.setPhone(phone);
        r.setCustomerType("INDIVIDUAL");
        return r;
    }

    @Test
    void createUpdateDeleteEachLeaveOneRowWithTheActor() {
        CustomerResponseDTO created = service.createCustomer(request("Ada", "ada.audit@example.com", "555 0100"));
        service.updateCustomer(created.getId(), request("Ada", "ada.audit@example.com", "555 0199"));
        when(orderClient.hasOrders(created.getId())).thenReturn(false);
        service.deleteCustomer(created.getId());

        var rows = audits.findByCustomerIdOrderByIdDesc(created.getId(), org.springframework.data.domain.PageRequest.of(0, 10))
                .getContent();
        assertThat(rows).extracting(a -> a.getAction()).containsExactly("DELETED", "UPDATED", "CREATED");
        assertThat(rows).allSatisfy(a -> assertThat(a.getActor()).isEqualTo("admin"));
        assertThat(rows.get(1).getDetails()).isEqualTo("Changed: phone");
    }

    @Test
    void personalDataValuesNeverReachTheTrail() {
        CustomerResponseDTO created = service.createCustomer(request("Zeynep", "zeynep.secret@example.com", "555 0123"));
        service.updateCustomer(created.getId(), request("Zeynep", "zeynep.other@example.com", "555 0456"));

        String everything = audits.findAll().toString() + audits.findAll().stream()
                .map(a -> a.getDetails() + " " + a.getActor()).reduce("", String::concat);
        assertThat(everything).doesNotContain("zeynep.secret").doesNotContain("zeynep.other")
                .doesNotContain("555 0123").doesNotContain("555 0456").doesNotContain("Zeynep");
    }

    @Test
    void aRefusedDuplicateLeavesNoRow() {
        service.createCustomer(request("First", "dup.audit@example.com", null));
        long before = audits.count();

        assertThatThrownBy(() -> service.createCustomer(request("Second", "DUP.AUDIT@example.com", null)))
                .isInstanceOf(DuplicateEmailException.class);

        assertThat(audits.count()).isEqualTo(before);
        assertThat(customers.count()).isEqualTo(1);
    }

    @Test
    void anUpdateThatChangesNothingSaysSo() {
        CustomerResponseDTO created = service.createCustomer(request("Same", "same.audit@example.com", "555 0001"));
        service.updateCustomer(created.getId(), request("Same", "SAME.audit@example.com", "555 0001"));

        var latest = audits.findAllByOrderByIdDesc(org.springframework.data.domain.PageRequest.of(0, 1)).getContent().get(0);
        assertThat(latest.getAction()).isEqualTo("UPDATED");
        assertThat(latest.getDetails()).isEqualTo("No field changed");
    }
}
