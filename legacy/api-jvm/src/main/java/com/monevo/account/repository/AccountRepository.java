package com.monevo.account.repository;

import com.monevo.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
	Optional<Account> findByIdAndDeletedAtIsNull(UUID id);

	Optional<Account> findByIdAndSubtypeAndDeletedAtIsNull(UUID id, Account.Subtype subtype);

	List<Account> findByOwnerUserIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(
		UUID ownerUserId, Account.Subtype subtype);

	Optional<Account> findByOwnerUserIdAndSubtypeAndDeletedAtIsNull(UUID ownerUserId, Account.Subtype subtype);

	long countByOwnerUserIdAndSubtypeAndDeletedAtIsNull(UUID ownerUserId, Account.Subtype subtype);

	List<Account> findByLedgerIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(
		UUID ledgerId, Account.Subtype subtype);

	List<Account> findByParentIdAndDeletedAtIsNullOrderBySortOrderAscNameAsc(UUID parentId);

	List<Account> findByParentIdInAndDeletedAtIsNull(Collection<UUID> parentIds);

	long countByParentIdAndDeletedAtIsNull(UUID parentId);

	long countByLedgerIdAndSubtypeAndParentIdIsNullAndDeletedAtIsNull(UUID ledgerId, Account.Subtype subtype);

	boolean existsByParentIdAndDeletedAtIsNull(UUID parentId);

	@Query("""
		select a from Account a
		where a.deletedAt is null
		and a.subtype = :subtype
		and a.id in (
			select la.accountId from LedgerAccount la
			where la.ledgerId = :ledgerId
			and la.deletedAt is null
		)
		order by a.sortOrder asc, a.name asc
		""")
	List<Account> findLinkedToLedger(@Param("ledgerId") UUID ledgerId, @Param("subtype") Account.Subtype subtype);

	default List<Account> findRealLinkedToLedger(UUID ledgerId) {
		return findLinkedToLedger(ledgerId, Account.Subtype.REAL);
	}
}
