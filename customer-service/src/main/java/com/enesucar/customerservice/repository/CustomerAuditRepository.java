package com.enesucar.customerservice.repository;

import com.enesucar.customerservice.entity.CustomerAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerAuditRepository extends JpaRepository<CustomerAudit, Long> {

    /** Newest first, one page at a time. */
    Page<CustomerAudit> findAllByOrderByIdDesc(Pageable pageable);

    Page<CustomerAudit> findByCustomerIdOrderByIdDesc(Long customerId, Pageable pageable);
}
