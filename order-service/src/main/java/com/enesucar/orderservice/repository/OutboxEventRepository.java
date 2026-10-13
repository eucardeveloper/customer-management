package com.enesucar.orderservice.repository;

import com.enesucar.orderservice.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * Oldest unpublished events, locked for this transaction. SKIP LOCKED lets several instances run the
     * relay at the same time without publishing the same row twice.
     */
    @Query(value = "SELECT * FROM outbox_event WHERE published_at IS NULL ORDER BY id LIMIT :batch FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<OutboxEvent> lockNextUnpublished(int batch);
}
