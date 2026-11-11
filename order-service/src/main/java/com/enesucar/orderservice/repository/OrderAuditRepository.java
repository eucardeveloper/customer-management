package com.enesucar.orderservice.repository;

import com.enesucar.orderservice.entity.OrderAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderAuditRepository extends JpaRepository<OrderAudit, Long> {

    List<OrderAudit> findByOrderIdOrderByIdAsc(Long orderId);
}
