package com.monevo.ledger.repository;

import com.monevo.ledger.entity.Ledger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerRepository extends JpaRepository<Ledger, UUID> {

	Optional<Ledger> findByIdAndDeletedAtIsNull(UUID id);

	List<Ledger> findByIdInAndDeletedAtIsNull(List<UUID> ids);
}
