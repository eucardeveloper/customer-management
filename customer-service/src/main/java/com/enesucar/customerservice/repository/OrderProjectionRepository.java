package com.enesucar.customerservice.repository;

import com.enesucar.customerservice.entity.OrderProjection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderProjectionRepository extends JpaRepository<OrderProjection, Long> {

    boolean existsByCustomerId(Long customerId);

    long countByCustomerId(Long customerId);
}
