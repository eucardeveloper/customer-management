package com.enesucar.auth_service.repository;

import com.enesucar.auth_service.entity.LoginFailure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface LoginFailureRepository extends JpaRepository<LoginFailure, Long> {

    /** Failures for one key since {@code since}, oldest first. */
    List<LoginFailure> findByThrottleKeyAndAttemptedAtAfterOrderByAttemptedAtAsc(String throttleKey, LocalDateTime since);

    @Modifying
    @Transactional
    @Query("delete from LoginFailure f where f.throttleKey = :key")
    void deleteAllByKey(String key);

    @Modifying
    @Transactional
    @Query("delete from LoginFailure f where f.attemptedAt < :before")
    int deleteOlderThan(LocalDateTime before);
}
