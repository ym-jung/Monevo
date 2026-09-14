package com.monevo.journal.repository;

import com.monevo.journal.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JournalEntryRepository
	extends JpaRepository<JournalEntry, UUID>, JpaSpecificationExecutor<JournalEntry> {
	Optional<JournalEntry> findByIdAndDeletedAtIsNull(UUID id);

	Optional<JournalEntry> findByCreatedByUserIdAndClientRequestId(UUID createdByUserId, UUID clientRequestId);

	List<JournalEntry> findByLedgerIdAndDeletedAtIsNull(UUID ledgerId);

	boolean existsByCreateRequestHashAndDeletedAtIsNull(String createRequestHash);

	List<JournalEntry> findByCreateRequestHashAndDeletedAtIsNull(String createRequestHash);

	@Modifying
	@Query("""
		update JournalEntry e set e.deletedAt = :deletedAt, e.deletedBy = :deletedBy
		where e.ledgerId = :ledgerId
		and e.deletedAt is null
		""")
	int softDeleteAllByLedgerId(@Param("ledgerId") UUID ledgerId, @Param("deletedBy") UUID deletedBy,
								@Param("deletedAt") Instant deletedAt);
}
