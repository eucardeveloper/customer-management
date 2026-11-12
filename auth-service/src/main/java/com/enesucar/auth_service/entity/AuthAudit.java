package com.enesucar.auth_service.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Who did what to which account, and when; see the V7 migration. Rows are only ever added.
 * Passwords and tokens are never stored here.
 */
@Entity
@Table(name = "auth_audit")
public class AuthAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(length = 100)
    private String target;

    @Column(length = 500)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected AuthAudit() {
    }

    public AuthAudit(String action, String actor, String target, String details) {
        this.action = action;
        this.actor = cut(actor, 100);
        this.target = cut(target, 100);
        this.details = cut(details, 500);
        this.createdAt = LocalDateTime.now();
    }

    private static String cut(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }

    public Long getId() { return id; }
    public String getAction() { return action; }
    public String getActor() { return actor; }
    public String getTarget() { return target; }
    public String getDetails() { return details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
