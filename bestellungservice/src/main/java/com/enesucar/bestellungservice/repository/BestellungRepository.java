package com.enesucar.bestellungservice.repository;

import com.enesucar.bestellungservice.entity.Bestellung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BestellungRepository extends JpaRepository<Bestellung, Long> {

    List<Bestellung> findByKundeId(Long kundeId);
}