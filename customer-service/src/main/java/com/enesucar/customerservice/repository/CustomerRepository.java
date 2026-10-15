package com.enesucar.customerservice.repository;

import com.enesucar.customerservice.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    /**
     * Claims the customer for deletion in one atomic statement. Returns 1 if this caller got the claim,
     * 0 if the customer is gone or another delete holds a claim younger than {@code staleBefore}.
     */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Customer c set c.deletionPendingSince = :now "
            + "where c.id = :id and (c.deletionPendingSince is null or c.deletionPendingSince < :staleBefore)")
    int claimForDeletion(@Param("id") Long id, @Param("now") LocalDateTime now,
                         @Param("staleBefore") LocalDateTime staleBefore);

    /** Gives the claim back (the delete was refused or failed). */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Customer c set c.deletionPendingSince = null where c.id = :id")
    int releaseDeletionClaim(@Param("id") Long id);
}
