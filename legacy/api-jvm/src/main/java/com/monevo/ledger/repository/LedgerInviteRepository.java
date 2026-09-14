package com.monevo.ledger.repository;

import com.monevo.ledger.entity.LedgerInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerInviteRepository extends JpaRepository<LedgerInvite, UUID> {
	Optional<LedgerInvite> findByCode(String code);

	Optional<LedgerInvite> findByIdAndLedgerId(UUID id, UUID ledgerId);

	List<LedgerInvite> findByLedgerIdOrderByCreatedAtDesc(UUID ledgerId);

	@Modifying
	@Query("""
		update LedgerInvite i set i.usedCount = i.usedCount + 1
		where i.id = :id
		and i.revokedAt is null
		and i.expiresAt > :now
		and i.usedCount < i.maxUses
		""")
	int incrementUsedCount(@Param("id") UUID id, @Param("now") Instant now);

	boolean existsByCode(String code);
}
