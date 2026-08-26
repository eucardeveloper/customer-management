package com.enesucar.orderservice.controller;

import com.enesucar.orderservice.dto.OrderRequestDTO;
import com.enesucar.orderservice.dto.OrderResponseDTO;
import com.enesucar.orderservice.exception.GlobalExceptionHandler;
import com.enesucar.orderservice.exception.ResourceNotFoundException;
import com.enesucar.orderservice.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private OrderService orderService;

    @InjectMocks
    private OrderController orderController;

    private OrderRequestDTO requestDTO;
    private OrderResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockMvc = MockMvcBuilders.standaloneSetup(orderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        requestDTO = new OrderRequestDTO();
        requestDTO.setCustomerId(10L);
        requestDTO.setProductName("Laptop");
        requestDTO.setPrice(new BigDecimal("1500.00"));
        requestDTO.setQuantity(1);
        requestDTO.setStatus("PENDING");

        responseDTO = new OrderResponseDTO();
        responseDTO.setId(1L);
        responseDTO.setCustomerId(10L);
        responseDTO.setProductName("Laptop");
        responseDTO.setPrice(new BigDecimal("1500.00"));
        responseDTO.setQuantity(1);
        responseDTO.setDate(LocalDateTime.now());
        responseDTO.setStatus("PENDING");
    }

    @Test
    void getAllOrders_shouldReturn200() throws Exception {
        when(orderService.getAllOrders()).thenReturn(List.of(responseDTO));
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Laptop"));
    }

    @Test
    void getOrderById_shouldReturn200_whenExists() throws Exception {
        when(orderService.getOrderById(1L)).thenReturn(responseDTO);
        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.productName").value("Laptop"));
    }

    @Test
    void getOrderById_shouldReturn404_whenNotFound() throws Exception {
        when(orderService.getOrderById(99L))
                .thenThrow(new ResourceNotFoundException("Order not found with ID: 99"));
        mockMvc.perform(get("/api/orders/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getOrdersByCustomerId_shouldReturn200() throws Exception {
        when(orderService.getOrdersByCustomerId(10L)).thenReturn(List.of(responseDTO));
        mockMvc.perform(get("/api/orders/customer/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerId").value(10));
    }

    @Test
    void createOrder_shouldReturn201_whenValid() throws Exception {
        when(orderService.createOrder(any(OrderRequestDTO.class))).thenReturn(responseDTO);
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.productName").value("Laptop"));
    }

    @Test
    void updateOrder_shouldReturn200_whenExists() throws Exception {
        when(orderService.updateOrder(eq(1L), any(OrderRequestDTO.class))).thenReturn(responseDTO);
        mockMvc.perform(put("/api/orders/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value("Laptop"));
    }

    @Test
    void updateOrder_shouldReturn404_whenNotFound() throws Exception {
        when(orderService.updateOrder(eq(99L), any(OrderRequestDTO.class)))
                .thenThrow(new ResourceNotFoundException("Order not found with ID: 99"));
        mockMvc.perform(put("/api/orders/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDTO)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteOrder_shouldReturn204_whenExists() throws Exception {
        doNothing().when(orderService).deleteOrder(1L);
        mockMvc.perform(delete("/api/orders/1"))
                .andExpect(status().isNoContent());
        verify(orderService).deleteOrder(1L);
    }

    @Test
    void deleteOrder_shouldReturn404_whenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Order not found with ID: 99"))
                .when(orderService).deleteOrder(99L);
        mockMvc.perform(delete("/api/orders/99"))
                .andExpect(status().isNotFound());
    }
}