package com.enesucar.auth_service.repository;

import com.enesucar.auth_service.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    /**
     * Revokes a token id; a second revocation of the same id (parallel logouts of one session) is a no-op.
     * Returns 1 when this call wrote the row, 0 when it already existed.
     */
    @Modifying
    @Transactional
    @Query(value = "insert into revoked_token (jti, expires_at) values (:jti, :expiresAt) on conflict (jti) do nothing", nativeQuery = true)
    int insertIfAbsent(String jti, LocalDateTime expiresAt);

    @Modifying
    @Transactional
    @Query("delete from RevokedToken r where r.expiresAt < :now")
    int deleteExpired(LocalDateTime now);
}
