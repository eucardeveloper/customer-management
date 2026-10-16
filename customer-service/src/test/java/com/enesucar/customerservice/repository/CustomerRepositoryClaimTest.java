package com.enesucar.customerservice.repository;

import com.enesucar.customerservice.entity.Customer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** The delete claim is one atomic UPDATE; these tests run it against a real (in-memory) database. */
@SpringBootTest
class CustomerRepositoryClaimTest {

    @Autowired CustomerRepository customers;

    private Long id;

    @BeforeEach
    void setUp() {
        customers.deleteAll();
        Customer c = new Customer();
        c.setFirstName("Claim");
        c.setLastName("Test");
        c.setCustomerType("INDIVIDUAL");
        id = customers.saveAndFlush(c).getId();
    }

    @Test
    void theFirstClaimWinsAndASecondOneIsRefused() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime staleBefore = now.minusSeconds(30);

        assertThat(customers.claimForDeletion(id, now, staleBefore)).isEqualTo(1);
        assertThat(customers.claimForDeletion(id, now, staleBefore)).isEqualTo(0);
    }

    @Test
    void releasingTheClaimLetsTheNextDeleteClaimAgain() {
        LocalDateTime now = LocalDateTime.now();
        customers.claimForDeletion(id, now, now.minusSeconds(30));

        customers.releaseDeletionClaim(id);

        assertThat(customers.findById(id).orElseThrow().getDeletionPendingSince()).isNull();
        assertThat(customers.claimForDeletion(id, now, now.minusSeconds(30))).isEqualTo(1);
    }

    @Test
    void anAbandonedClaimCanBeTakenOver() {
        // a delete that crashed 60 s ago must not block the customer forever
        LocalDateTime now = LocalDateTime.now();
        customers.claimForDeletion(id, now.minusSeconds(60), now.minusSeconds(90));

        assertThat(customers.claimForDeletion(id, now, now.minusSeconds(30))).isEqualTo(1);
    }

    @Test
    void claimingACustomerThatDoesNotExistChangesNothing() {
        LocalDateTime now = LocalDateTime.now();
        assertThat(customers.claimForDeletion(999_999L, now, now.minusSeconds(30))).isEqualTo(0);
    }
}
