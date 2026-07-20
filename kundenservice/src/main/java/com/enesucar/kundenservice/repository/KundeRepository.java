package com.enesucar.kundenservice.repository;

import com.enesucar.kundenservice.entity.Kunde;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KundeRepository extends JpaRepository<Kunde, Long> {
    boolean existsByEmail(String email);
}