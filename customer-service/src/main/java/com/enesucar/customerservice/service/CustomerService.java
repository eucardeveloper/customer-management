package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.dto.CustomerResponseDTO;
import com.enesucar.customerservice.entity.Customer;
import com.enesucar.customerservice.exception.CustomerHasOrdersException;
import com.enesucar.customerservice.exception.ResourceNotFoundException;
import com.enesucar.customerservice.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OrderClient orderClient;

    public CustomerService(CustomerRepository customerRepository, OrderClient orderClient) {
        this.customerRepository = customerRepository;
        this.orderClient = orderClient;
    }

    public List<CustomerResponseDTO> getAllCustomers() {
        return customerRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CustomerResponseDTO createCustomer(CustomerRequestDTO request) {
        Customer customer = new Customer();
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
		customer.setCustomerType(request.getCustomerType());
        Customer saved = customerRepository.save(customer);
        return toResponse(saved);
    }

    public CustomerResponseDTO getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
        return toResponse(customer);
    }

    public CustomerResponseDTO updateCustomer(Long id, CustomerRequestDTO request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
		customer.setCustomerType(request.getCustomerType());
        Customer saved = customerRepository.save(customer);
        return toResponse(saved);
    }

    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Customer not found with ID: " + id);
        }
        // Separate databases: the order-service has to be asked. A race (an order created between the
        // check and the delete) is possible and is the known limit of not sharing a transaction.
        if (orderClient.hasOrders(id)) {
            throw new CustomerHasOrdersException(id);
        }
        customerRepository.deleteById(id);
    }

    private CustomerResponseDTO toResponse(Customer customer) {
        CustomerResponseDTO response = new CustomerResponseDTO();
        response.setId(customer.getId());
        response.setFirstName(customer.getFirstName());
        response.setLastName(customer.getLastName());
        response.setEmail(customer.getEmail());
        response.setPhone(customer.getPhone());
		response.setCustomerType(customer.getCustomerType());
        return response;
    }
}
