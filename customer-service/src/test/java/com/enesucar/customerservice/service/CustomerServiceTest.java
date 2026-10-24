package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.exception.CustomerHasOrdersException;
import com.enesucar.customerservice.exception.DeletionInProgressException;
import com.enesucar.customerservice.exception.OrderServiceUnavailableException;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.dto.CustomerResponseDTO;
import com.enesucar.customerservice.entity.Customer;
import com.enesucar.customerservice.exception.ResourceNotFoundException;
import com.enesucar.customerservice.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private OrderClient orderClient;

    @Mock
    private com.enesucar.customerservice.repository.OrderProjectionRepository orderProjection;

    @InjectMocks
    private CustomerService customerService;

    private Customer customer;
    private CustomerRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        customer = new Customer();
        customer.setId(1L);
        customer.setFirstName("John");
        customer.setLastName("Doe");
        customer.setEmail("john@test.com");
        customer.setPhone("5551234567");
        customer.setCustomerType("INDIVIDUAL");

        requestDTO = new CustomerRequestDTO();
        requestDTO.setFirstName("John");
        requestDTO.setLastName("Doe");
        requestDTO.setEmail("john@test.com");
        requestDTO.setPhone("5551234567");
        requestDTO.setCustomerType("INDIVIDUAL");
    }

    @Test
    void getAllCustomers_shouldReturnList() {
        when(customerRepository.findAll()).thenReturn(List.of(customer));
        List<CustomerResponseDTO> result = customerService.getAllCustomers();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("john@test.com");
    }

    @Test
    void getAllCustomers_shouldReturnEmptyList_whenNoCustomers() {
        when(customerRepository.findAll()).thenReturn(List.of());
        List<CustomerResponseDTO> result = customerService.getAllCustomers();
        assertThat(result).isEmpty();
    }

    @Test
    void createCustomer_shouldSaveAndReturnResponse() {
        when(customerRepository.save(any(Customer.class))).thenReturn(customer);
        CustomerResponseDTO result = customerService.createCustomer(requestDTO);
        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getEmail()).isEqualTo("john@test.com");
        verify(customerRepository).save(any(Customer.class));
    }

    @Test
    void getCustomerById_shouldReturnCustomer_whenExists() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        CustomerResponseDTO result = customerService.getCustomerById(1L);
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getFirstName()).isEqualTo("John");
    }

    @Test
    void getCustomerById_shouldThrowException_whenNotFound() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> customerService.getCustomerById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Customer not found with ID: 99");
    }

    @Test
    void updateCustomer_shouldUpdateAndReturn_whenExists() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(customerRepository.save(any(Customer.class))).thenReturn(customer);
        CustomerResponseDTO result = customerService.updateCustomer(1L, requestDTO);
        assertThat(result.getFirstName()).isEqualTo("John");
        verify(customerRepository).save(any(Customer.class));
    }

    @Test
    void updateCustomer_shouldThrowException_whenNotFound() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> customerService.updateCustomer(99L, requestDTO))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Customer not found with ID: 99");
        verify(customerRepository, never()).save(any());
    }

    @Test
    void deleteCustomer_shouldDelete_whenExists() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenReturn(false);
        doNothing().when(customerRepository).deleteById(1L);
        customerService.deleteCustomer(1L);
        verify(customerRepository).deleteById(1L);
        // deleted: nothing left to release
        verify(customerRepository, never()).releaseDeletionClaim(any());
    }

    @Test
    void deleteCustomer_shouldThrowException_whenNotFound() {
        when(customerRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> customerService.deleteCustomer(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Customer not found with ID: 99");
        verify(customerRepository, never()).deleteById(any());
    }

    @Test
    void deleteCustomer_shouldRefuse_whenCustomerStillHasOrders() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenReturn(true);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L))
                .isInstanceOf(CustomerHasOrdersException.class);
        verify(customerRepository, never()).deleteById(any());
        verify(customerRepository).releaseDeletionClaim(1L);
    }

    @Test
    void deleteCustomer_shouldFailClosed_whenOrderServiceCannotBeAsked() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenThrow(new OrderServiceUnavailableException(new RuntimeException("down")));
        assertThatThrownBy(() -> customerService.deleteCustomer(1L))
                .isInstanceOf(OrderServiceUnavailableException.class);
        verify(customerRepository, never()).deleteById(any());
        verify(customerRepository).releaseDeletionClaim(1L);
    }

    @Test
    void deleteCustomer_shouldRefuseWithTheRealReason_whenOrderServiceIsDownButTheProjectionKnowsOrders() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenThrow(new OrderServiceUnavailableException(new RuntimeException("down")));
        when(orderProjection.existsByCustomerId(1L)).thenReturn(true);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L)).isInstanceOf(CustomerHasOrdersException.class);
        verify(customerRepository, never()).deleteById(any());
        verify(customerRepository).releaseDeletionClaim(1L);
    }

    @Test
    void deleteCustomer_shouldStillFailClosed_whenOrderServiceIsDownAndTheProjectionKnowsNothing() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenThrow(new OrderServiceUnavailableException(new RuntimeException("down")));
        when(orderProjection.existsByCustomerId(1L)).thenReturn(false);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L)).isInstanceOf(OrderServiceUnavailableException.class);
        verify(customerRepository, never()).deleteById(any());
    }

    @Test
    void deleteCustomer_shouldTrustTheOrderServiceOverTheProjection_whenItAnswers() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenReturn(false);
        customerService.deleteCustomer(1L);
        verify(orderProjection, never()).existsByCustomerId(any());
        verify(customerRepository).deleteById(1L);
    }

    @Test
    void deleteCustomer_shouldGiveTheClaimBack_whenTheDeleteItselfFails() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(1);
        when(orderClient.hasOrders(1L)).thenReturn(false);
        doThrow(new IllegalStateException("db down")).when(customerRepository).deleteById(1L);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L)).isInstanceOf(IllegalStateException.class);
        verify(customerRepository).releaseDeletionClaim(1L);
    }

    @Test
    void deleteCustomer_shouldRefuse_whenAnotherDeleteHoldsTheClaim() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(0);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L)).isInstanceOf(DeletionInProgressException.class);
        verify(orderClient, never()).hasOrders(any());
        verify(customerRepository, never()).deleteById(any());
        // the claim belongs to the other delete: it must not be released here
        verify(customerRepository, never()).releaseDeletionClaim(any());
    }

    @Test
    void deleteCustomer_shouldReportNotFound_whenTheCustomerVanishesBetweenCheckAndClaim() {
        when(customerRepository.existsById(1L)).thenReturn(true, false);
        when(customerRepository.claimForDeletion(eq(1L), any(), any())).thenReturn(0);
        assertThatThrownBy(() -> customerService.deleteCustomer(1L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getCustomerById_shouldReadAsNotFound_whileADeleteHoldsAFreshClaim() {
        customer.setDeletionPendingSince(LocalDateTime.now().minusSeconds(2));
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        assertThatThrownBy(() -> customerService.getCustomerById(1L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getCustomerById_shouldIgnoreAnAbandonedClaim() {
        // a crash in the middle of a delete must not hide the customer for good
        customer.setDeletionPendingSince(LocalDateTime.now().minus(CustomerService.DELETION_CLAIM_HOLD).minusSeconds(5));
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        assertThat(customerService.getCustomerById(1L).getId()).isEqualTo(1L);
    }
}
