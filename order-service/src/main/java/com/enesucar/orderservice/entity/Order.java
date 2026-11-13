package com.enesucar.orderservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long customerId;

    private String productName;

    @Column(precision = 19, scale = 10)
    private BigDecimal price;

    private Integer quantity;

    private LocalDateTime date;
	
	private String status;

    /** Optimistic lock (V13): a save of a copy that someone else has changed since is refused, not merged. */
    @Version
    private Long version;
}
