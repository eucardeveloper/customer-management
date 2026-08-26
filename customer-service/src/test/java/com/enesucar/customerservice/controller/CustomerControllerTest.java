package com.enesucar.customerservice.controller;

import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.dto.CustomerResponseDTO;
import com.enesucar.customerservice.exception.GlobalExceptionHandler;
import com.enesucar.customerservice.exception.ResourceNotFoundException;
import com.enesucar.customerservice.service.CustomerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CustomerService customerService;

    @InjectMocks
    private CustomerController customerController;

    private CustomerRequestDTO requestDTO;
    private CustomerResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        requestDTO = new CustomerRequestDTO();
        requestDTO.setFirstName("John");
        requestDTO.setLastName("Doe");
        requestDTO.setEmail("john@test.com");
        requestDTO.setPhone("5551234567");
        requestDTO.setCustomerType("INDIVIDUAL");

        responseDTO = new CustomerResponseDTO();
        responseDTO.setId(1L);
        responseDTO.setFirstName("John");
        responseDTO.setLastName("Doe");
        responseDTO.setEmail("john@test.com");
        responseDTO.setPhone("5551234567");
        responseDTO.setCustomerType("INDIVIDUAL");
    }

    @Test
    void getAllCustomers_shouldReturn200() throws Exception {
        when(customerService.getAllCustomers()).thenReturn(List.of(responseDTO));
        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].firstName").value("John"))
                .andExpect(jsonPath("$[0].email").value("john@test.com"));
    }

    @Test
    void getCustomerById_shouldReturn200_whenExists() throws Exception {
        when(customerService.getCustomerById(1L)).thenReturn(responseDTO);
        mockMvc.perform(get("/api/customers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void getCustomerById_shouldReturn404_whenNotFound() throws Exception {
        when(customerService.getCustomerById(99L))
                .thenThrow(new ResourceNotFoundException("Customer not found with ID: 99"));
        mockMvc.perform(get("/api/customers/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createCustomer_shouldReturn200_whenValid() throws Exception {
        when(customerService.createCustomer(any(CustomerRequestDTO.class))).thenReturn(responseDTO);
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void updateCustomer_shouldReturn200_whenExists() throws Exception {
        when(customerService.updateCustomer(eq(1L), any(CustomerRequestDTO.class))).thenReturn(responseDTO);
        mockMvc.perform(put("/api/customers/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void updateCustomer_shouldReturn404_whenNotFound() throws Exception {
        when(customerService.updateCustomer(eq(99L), any(CustomerRequestDTO.class)))
                .thenThrow(new ResourceNotFoundException("Customer not found with ID: 99"));
        mockMvc.perform(put("/api/customers/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteCustomer_shouldReturn204_whenExists() throws Exception {
        doNothing().when(customerService).deleteCustomer(1L);
        mockMvc.perform(delete("/api/customers/1"))
                .andExpect(status().isNoContent());
        verify(customerService).deleteCustomer(1L);
    }

    @Test
    void deleteCustomer_shouldReturn404_whenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Customer not found with ID: 99"))
                .when(customerService).deleteCustomer(99L);
        mockMvc.perform(delete("/api/customers/99"))
                .andExpect(status().isNotFound());
    }
}