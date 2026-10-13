package com.enesucar.orderservice.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** One event waiting to be (or already) published to Kafka; see the V6 migration. */
@Entity
@Table(name = "outbox_event")
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String topic;

    @Column(nullable = false, length = 2000)
    private String payload;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    protected OutboxEvent() {
    }

    public OutboxEvent(String topic, String payload) {
        this.topic = topic;
        this.payload = payload;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTopic() { return topic; }
    public String getPayload() { return payload; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void markPublished() { this.publishedAt = LocalDateTime.now(); }
}
