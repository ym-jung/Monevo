package com.monevo.ledger.repository;

import com.monevo.ledger.entity.LedgerMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerMemberRepository extends JpaRepository<LedgerMember, UUID> {

	Optional<LedgerMember> findByLedgerIdAndUserIdAndDeletedAtIsNull(UUID ledgerId, UUID userId);

	boolean existsByLedgerIdAndUserIdAndDeletedAtIsNull(UUID ledgerId, UUID userId);

	List<LedgerMember> findByUserIdAndDeletedAtIsNull(UUID userId);

	List<LedgerMember> findByLedgerIdAndDeletedAtIsNull(UUID ledgerId);

	long countByLedgerIdAndDeletedAtIsNull(UUID ledgerId);

	@Query("""
		select m.ledgerId as ledgerId, count(m) as memberCount
		from LedgerMember m
		where m.ledgerId in :ledgerIds
		and m.deletedAt is null
		group by m.ledgerId
		""")
	List<LedgerMemberCount> countByLedgerIdIn(@Param("ledgerIds") Collection<UUID> ledgerIds);

	interface LedgerMemberCount {
		UUID getLedgerId();

		long getMemberCount();
	}
}
