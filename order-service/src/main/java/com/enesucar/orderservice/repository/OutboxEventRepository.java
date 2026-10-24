package com.enesucar.orderservice.repository;

import com.enesucar.orderservice.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /** Housekeeping: rows that were published long ago are no longer needed. */
    @Modifying
    @Transactional
    @Query("delete from OutboxEvent e where e.publishedAt is not null and e.publishedAt < :before")
    int deletePublishedBefore(LocalDateTime before);

    /** Monitoring: events written but not yet acknowledged by Kafka (parked events are counted separately). */
    @Query("select count(e) from OutboxEvent e where e.publishedAt is null and e.parkedAt is null")
    long countPending();

    /** Monitoring: events given up on because they can never be published; each one needs a human. */
    long countByParkedAtIsNotNull();

    /** Monitoring: when the oldest still-unpublished event was written (null when none is waiting). */
    @Query("select min(e.createdAt) from OutboxEvent e where e.publishedAt is null and e.parkedAt is null")
    LocalDateTime oldestUnpublishedCreatedAt();

    /**
     * Oldest unpublished events, locked for this transaction. SKIP LOCKED lets several instances run the
     * relay at the same time without publishing the same row twice.
     */
    @Query(value = "SELECT * FROM outbox_event WHERE published_at IS NULL AND parked_at IS NULL ORDER BY id LIMIT :batch FOR UPDATE SKIP LOCKED",
            nativeQuery = true)
    List<OutboxEvent> lockNextUnpublished(int batch);
}
