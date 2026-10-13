package com.enesucar.auth_service.repository;

import com.enesucar.auth_service.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    @Modifying
    @Transactional
    @Query("delete from RevokedToken r where r.expiresAt < :now")
    int deleteExpired(LocalDateTime now);
}
