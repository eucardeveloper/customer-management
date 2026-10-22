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
    /** Housekeeping: rows that were published long ago are no longer needed. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("delete from OutboxEvent e where e.publishedAt is not null and e.publishedAt < :before")
    int deletePublishedBefore(java.time.LocalDateTime before);

    /** Monitoring: events written but not yet acknowledged by Kafka. */
    long countByPublishedAtIsNull();

    /** Monitoring: when the oldest still-unpublished event was written (null when none is waiting). */
    @Query("select min(e.createdAt) from OutboxEvent e where e.publishedAt is null")
    java.time.LocalDateTime oldestUnpublishedCreatedAt();

    @Query(value = "SELECT * FROM outbox_event WHERE published_at IS NULL ORDER BY id LIMIT :batch FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<OutboxEvent> lockNextUnpublished(int batch);
}
