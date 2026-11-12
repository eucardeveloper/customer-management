package com.enesucar.auth_service.repository;

import com.enesucar.auth_service.entity.AuthAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAuditRepository extends JpaRepository<AuthAudit, Long> {

    /** Newest first, one page at a time. */
    Page<AuthAudit> findAllByOrderByIdDesc(Pageable pageable);

    Page<AuthAudit> findByTargetOrderByIdDesc(String target, Pageable pageable);
}
