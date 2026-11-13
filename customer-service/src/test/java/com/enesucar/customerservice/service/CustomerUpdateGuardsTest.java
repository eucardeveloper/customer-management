package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.entity.Customer;
import com.enesucar.customerservice.exception.DeletionInProgressException;
import com.enesucar.customerservice.exception.DuplicateEmailException;
import com.enesucar.customerservice.exception.StaleVersionException;
import com.enesucar.customerservice.repository.CustomerAuditRepository;
import com.enesucar.customerservice.repository.CustomerRepository;
import com.enesucar.customerservice.repository.OrderProjectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** An edit must not race a delete, must not overwrite a newer copy, and must not mislabel other failures. */
@ExtendWith(MockitoExtension.class)
class CustomerUpdateGuardsTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private OrderClient orderClient;
    @Mock private OrderProjectionRepository orderProjection;
    @Mock private CustomerAuditRepository customerAudits;
    @Mock private PlatformTransactionManager transactionManager;
    @InjectMocks private CustomerService customerService;

    private Customer stored;

    @BeforeEach
    void setUp() {
        stored = new Customer();
        stored.setId(5L);
        stored.setFirstName("Ayse");
        stored.setEmail("ayse@example.com");
        stored.setVersion(3L);
    }

    private CustomerRequestDTO request(Long version) {
        CustomerRequestDTO r = new CustomerRequestDTO();
        r.setFirstName("Ayse");
        r.setEmail("ayse@example.com");
        r.setVersion(version);
        return r;
    }

    @Test
    void aCustomerWhoseDeleteIsBeingCheckedCannotBeEdited() {
        stored.setDeletionPendingSince(LocalDateTime.now());
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> customerService.updateCustomer(5L, request(null)))
                .isInstanceOf(DeletionInProgressException.class);

        verify(customerRepository, never()).saveAndFlush(any());
    }

    @Test
    void anAbandonedDeleteClaimDoesNotBlockEditsForever() {
        stored.setDeletionPendingSince(LocalDateTime.now().minusMinutes(5));
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));
        when(customerRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(customerService.updateCustomer(5L, request(null)).getId()).isEqualTo(5L);
    }

    @Test
    void anEditBasedOnAnOlderVersionIsRefused() {
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> customerService.updateCustomer(5L, request(2L)))
                .isInstanceOf(StaleVersionException.class);

        verify(customerRepository, never()).saveAndFlush(any());
    }

    @Test
    void anEditWithTheCurrentVersionOrNoVersionIsAccepted() {
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));
        when(customerRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(customerService.updateCustomer(5L, request(3L)).getVersion()).isEqualTo(3L);
        assertThat(customerService.updateCustomer(5L, request(null)).getId()).isEqualTo(5L);
    }

    @Test
    void onlyTheEmailIndexViolationIsReportedAsADuplicateEmail() {
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));
        DataIntegrityViolationException other = new DataIntegrityViolationException("could not execute statement",
                new RuntimeException("ERROR: value too long for type character varying(100)"));
        when(customerRepository.saveAndFlush(any())).thenThrow(other);

        assertThatThrownBy(() -> customerService.updateCustomer(5L, request(null))).isSameAs(other);
    }

    @Test
    void theEmailIndexViolationIsStillReportedAsADuplicateEmail() {
        when(customerRepository.findById(5L)).thenReturn(Optional.of(stored));
        when(customerRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("could not execute statement",
                new RuntimeException("ERROR: duplicate key value violates unique constraint \"uq_customer_email_lower\"")));

        assertThatThrownBy(() -> customerService.updateCustomer(5L, request(null)))
                .isInstanceOf(DuplicateEmailException.class);
    }
}
