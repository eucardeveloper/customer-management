package com.enesucar.customerservice.service;

import com.enesucar.customerservice.client.OrderClient;
import com.enesucar.customerservice.dto.CustomerRequestDTO;
import com.enesucar.customerservice.dto.CustomerResponseDTO;
import com.enesucar.customerservice.entity.Customer;
import com.enesucar.customerservice.exception.CustomerHasOrdersException;
import com.enesucar.customerservice.exception.DeletionInProgressException;
import com.enesucar.customerservice.exception.ResourceNotFoundException;
import com.enesucar.customerservice.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    /**
     * How long a delete may hold its claim. It has to outlast the order-service lookup (connect 2 s + read 3 s)
     * with room to spare; after that the claim is treated as abandoned.
     */
    static final Duration DELETION_CLAIM_HOLD = Duration.ofSeconds(30);

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
        // A customer whose delete is being checked right now reads as gone, so the order-service
        // cannot attach a new order to it in that window.
        if (isBeingDeleted(customer)) {
            throw new ResourceNotFoundException("Customer not found with ID: " + id);
        }
        return toResponse(customer);
    }

    private boolean isBeingDeleted(Customer customer) {
        LocalDateTime since = customer.getDeletionPendingSince();
        return since != null && since.isAfter(LocalDateTime.now().minus(DELETION_CLAIM_HOLD));
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

    /**
     * Two services, two databases, so no shared transaction. The delete is made safe in three steps:
     * claim the customer (it now reads as "not found" to the order-service), ask whether orders exist,
     * and only then delete. The order-service re-checks the customer after saving an order and undoes
     * the order if the customer is gone or claimed, so no interleaving leaves an order pointing at nobody.
     */
    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Customer not found with ID: " + id);
        }
        LocalDateTime now = LocalDateTime.now();
        if (customerRepository.claimForDeletion(id, now, now.minus(DELETION_CLAIM_HOLD)) == 0) {
            if (!customerRepository.existsById(id)) {
                throw new ResourceNotFoundException("Customer not found with ID: " + id);
            }
            throw new DeletionInProgressException(id);
        }
        boolean deleted = false;
        try {
            if (orderClient.hasOrders(id)) {
                throw new CustomerHasOrdersException(id);
            }
            customerRepository.deleteById(id);
            deleted = true;
        } finally {
            if (!deleted) {
                customerRepository.releaseDeletionClaim(id);
            }
        }
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
