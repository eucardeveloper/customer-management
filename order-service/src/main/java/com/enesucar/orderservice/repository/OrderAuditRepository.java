package com.enesucar.orderservice.repository;

import com.enesucar.orderservice.entity.OrderAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderAuditRepository extends JpaRepository<OrderAudit, Long> {

    List<OrderAudit> findByOrderIdOrderByIdAsc(Long orderId);

    /** Newest first, one page at a time. */
    Page<OrderAudit> findAllByOrderByIdDesc(Pageable pageable);

    Page<OrderAudit> findByOrderIdOrderByIdDesc(Long orderId, Pageable pageable);
}
