package com.enesucar.orderservice.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Who changed which order, when, and how; see the V12 migration. Rows are only ever added. */
@Entity
@Table(name = "order_audit")
public class OrderAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(name = "old_status", length = 50)
    private String oldStatus;

    @Column(name = "new_status", length = 50)
    private String newStatus;

    @Column(length = 500)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected OrderAudit() {
    }

    public OrderAudit(Long orderId, String action, String actor, String oldStatus, String newStatus, String details) {
        this.orderId = orderId;
        this.action = action;
        this.actor = actor;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.details = details != null && details.length() > 500 ? details.substring(0, 500) : details;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public String getAction() { return action; }
    public String getActor() { return actor; }
    public String getOldStatus() { return oldStatus; }
    public String getNewStatus() { return newStatus; }
    public String getDetails() { return details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
