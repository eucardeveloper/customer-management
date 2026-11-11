package com.enesucar.customerservice.service;

import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.exception.DuplicateEmailException;
import com.enesucar.customerservice.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves e-mail uniqueness on a real PostgreSQL with the real Flyway migrations (V5 unique index):
 * the exists-check alone lets two concurrent creates through; the index must stop the second one
 * and the service must answer with DuplicateEmailException (409), not a raw 500.
 * Needs Docker; fails with a clear error when it is not running (never skipped silently).
 */
@Testcontainers
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true"
})
class CustomerEmailUniqueIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired CustomerService service;
    @Autowired CustomerRepository customers;

    @BeforeEach
    void clean() {
        customers.deleteAll();
    }

    private static CustomerRequestDTO request(String email) {
        CustomerRequestDTO r = new CustomerRequestDTO();
        r.setFirstName("Uniq");
        r.setLastName("Test");
        r.setEmail(email);
        r.setCustomerType("INDIVIDUAL");
        return r;
    }

    @Test
    void sameEmailDifferentCaseIsRejectedWithDuplicateEmailException() {
        service.createCustomer(request("a@example.com"));

        assertThatThrownBy(() -> service.createCustomer(request("A@Example.com")))
                .isInstanceOf(DuplicateEmailException.class);
        assertThat(customers.count()).isEqualTo(1);
    }

    @Test
    void theIndexRejectsAnInsertThatSkipsTheServiceCheck() {
        service.createCustomer(request("b@example.com"));
        var second = new com.enesucar.customerservice.entity.Customer();
        second.setFirstName("Raw");
        second.setEmail("B@EXAMPLE.COM");

        assertThatThrownBy(() -> customers.saveAndFlush(second))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void customersWithoutEmailAreNotAffectedByTheIndex() {
        CustomerRequestDTO a = request(null);
        a.setPhone("+90 555 000 00 01");
        CustomerRequestDTO b = request(null);
        b.setPhone("+90 555 000 00 02");

        service.createCustomer(a);
        service.createCustomer(b);

        assertThat(customers.count()).isEqualTo(2);
    }

    @Test
    void concurrentCreatesWithTheSameEmailLeaveExactlyOneRow() throws Exception {
        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    service.createCustomer(request("race@example.com"));
                    return true;
                } catch (DuplicateEmailException e) {
                    return false;
                }
            }));
        }
        start.countDown();
        int created = 0;
        for (Future<Boolean> f : results) {
            if (f.get()) {
                created++;
            }
        }
        pool.shutdown();

        assertThat(created).isEqualTo(1);
        assertThat(customers.count()).isEqualTo(1);
    }
}
