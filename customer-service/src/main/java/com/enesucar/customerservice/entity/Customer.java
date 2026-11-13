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

    /**
     * Set while a delete is checking for orders (see V3 migration); null otherwise. Only the claim/release
     * queries in CustomerRepository write it: a normal save never includes this column, so an update that
     * read the row before a delete claimed it cannot wipe the claim.
     */
    @Column(name = "deletion_pending_since", insertable = false, updatable = false)
    private LocalDateTime deletionPendingSince;

    /** Optimistic lock (V7): a save of a copy that someone else has changed since is refused, not merged. */
    @Version
    private Long version;
}

