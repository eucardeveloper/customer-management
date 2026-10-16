package com.enesucar.customerservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer")
@Getter
@Setter
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;
	
	private String customerType;

    /** Set while a delete is checking for orders (see V3 migration); null otherwise. */
    @Column(name = "deletion_pending_since")
    private LocalDateTime deletionPendingSince;
}

