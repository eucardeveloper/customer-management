package com.enesucar.orderservice.repository;

import com.enesucar.orderservice.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, String> {

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("delete from ProcessedEvent p where p.processedAt < :before")
    int deleteOlderThan(java.time.LocalDateTime before);
}
