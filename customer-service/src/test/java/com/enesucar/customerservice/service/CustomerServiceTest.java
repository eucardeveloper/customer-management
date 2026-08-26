package com.enesucar.customerservice.service;

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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

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
        doNothing().when(customerRepository).deleteById(1L);
        customerService.deleteCustomer(1L);
        verify(customerRepository).deleteById(1L);
    }

    @Test
    void deleteCustomer_shouldThrowException_whenNotFound() {
        when(customerRepository.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> customerService.deleteCustomer(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Customer not found with ID: 99");
        verify(customerRepository, never()).deleteById(any());
    }
}