package com.enesucar.customerservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** One order as the customer-service last heard of it: just enough to know whose it is. */
@Entity
@Table(name = "order_projection")
@Getter
@Setter
@NoArgsConstructor
public class OrderProjection {

    @Id
    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public OrderProjection(Long orderId, Long customerId, LocalDateTime updatedAt) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.updatedAt = updatedAt;
    }
}
