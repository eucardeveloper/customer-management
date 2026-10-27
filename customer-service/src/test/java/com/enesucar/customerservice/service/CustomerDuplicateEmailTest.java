package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.entity.Customer;
import com.enesucar.customerservice.exception.DuplicateEmailException;
import com.enesucar.customerservice.repository.CustomerRepository;
import com.enesucar.customerservice.repository.OrderProjectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Aynı e-posta ile ikinci müşteri sunucuda reddedilir (büyük/küçük harf fark etmez). */
@ExtendWith(MockitoExtension.class)
class CustomerDuplicateEmailTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private OrderClient orderClient;
    @Mock private OrderProjectionRepository orderProjection;
    @InjectMocks private CustomerService customerService;

    private CustomerRequestDTO request(String email) {
        CustomerRequestDTO r = new CustomerRequestDTO();
        r.setFirstName("Ayse");
        r.setEmail(email);
        return r;
    }

    @Test
    void createWithExistingEmailIsRejected() {
        when(customerRepository.existsByEmailIgnoreCase("ayse@example.com")).thenReturn(true);
        assertThatThrownBy(() -> customerService.createCustomer(request(" ayse@example.com ")))
                .isInstanceOf(DuplicateEmailException.class);
        verify(customerRepository, never()).save(any());
    }

    @Test
    void updateToAnotherCustomersEmailIsRejected() {
        Customer existing = new Customer();
        existing.setId(5L);
        when(customerRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(customerRepository.existsByEmailIgnoreCaseAndIdNot("ayse@example.com", 5L)).thenReturn(true);
        assertThatThrownBy(() -> customerService.updateCustomer(5L, request("ayse@example.com")))
                .isInstanceOf(DuplicateEmailException.class);
        verify(customerRepository, never()).save(any());
    }
}
