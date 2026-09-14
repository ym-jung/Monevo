package com.monevo.journal.repository;

import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface JournalLineRepository extends JpaRepository<JournalLine, UUID> {
	List<JournalLine> findByEntryIdAndDeletedAtIsNullOrderByLineNoAsc(UUID entryId);

	List<JournalLine> findByEntryIdInAndDeletedAtIsNullOrderByLineNoAsc(Collection<UUID> entryIds);

	@Query("""
		select count(l) > 0 from JournalLine l, JournalEntry e
		where l.entryId = e.id
		and l.accountId = :accountId
		and l.deletedAt is null
		and e.deletedAt is null
		""")
	boolean existsLiveLineForAccount(@Param("accountId") UUID accountId);

	@Query("""
		select count(l) > 0 from JournalLine l, JournalEntry e
		where l.entryId = e.id
		and l.accountId = :accountId
		and l.deletedAt is null
		and e.deletedAt is null
		and e.kind <> :excludedKind
		""")
	boolean existsLineForAccountExcludingKind(@Param("accountId") UUID accountId,
											@Param("excludedKind") JournalEntry.Kind excludedKind);

	@Modifying
	@Query("""
		update JournalLine l set l.deletedAt = :deletedAt, l.deletedBy = :deletedBy
		where l.entryId = :entryId
		and l.deletedAt is null
		""")
	int softDeleteAllByEntryId(@Param("entryId") UUID entryId, @Param("deletedBy") UUID deletedBy,
								@Param("deletedAt") Instant deletedAt);

	@Modifying
	@Query("""
		update JournalLine l set l.deletedAt = :deletedAt, l.deletedBy = :deletedBy
		where l.entryId in (
			select e.id from JournalEntry e where e.ledgerId = :ledgerId
		)
		and l.deletedAt is null
		""")
	int softDeleteAllByLedgerId(@Param("ledgerId") UUID ledgerId, @Param("deletedBy") UUID deletedBy,
								@Param("deletedAt") Instant deletedAt);
}
