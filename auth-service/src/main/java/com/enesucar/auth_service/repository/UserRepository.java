package com.enesucar.auth_service.repository;

import com.enesucar.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    long countByRole(com.enesucar.auth_service.entity.Role role);

    /**
     * Ids of every administrator, row-locked until the calling transaction ends. Two "is this the last
     * admin?" checks running at the same moment are serialised here: the second one waits, then sees the
     * first one's change. Locked in id order so two callers never deadlock on each other.
     */
    @Query(value = "SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id FOR UPDATE", nativeQuery = true)
    List<Long> lockAdminIds();

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
