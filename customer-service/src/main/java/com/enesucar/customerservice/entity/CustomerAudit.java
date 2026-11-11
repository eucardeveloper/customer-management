package com.enesucar.customerservice.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Who created, changed or deleted which customer, and when; see the V6 migration. Rows are only ever added. */
@Entity
@Table(name = "customer_audit")
public class CustomerAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(length = 500)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected CustomerAudit() {
    }

    public CustomerAudit(Long customerId, String action, String actor, String details) {
        this.customerId = customerId;
        this.action = action;
        this.actor = actor != null && actor.length() > 100 ? actor.substring(0, 100) : actor;
        this.details = details != null && details.length() > 500 ? details.substring(0, 500) : details;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getCustomerId() { return customerId; }
    public String getAction() { return action; }
    public String getActor() { return actor; }
    public String getDetails() { return details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
