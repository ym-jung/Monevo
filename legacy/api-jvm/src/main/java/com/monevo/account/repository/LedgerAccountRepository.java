package com.monevo.account.repository;

import com.monevo.account.entity.LedgerAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerAccountRepository extends JpaRepository<LedgerAccount, UUID> {
	List<LedgerAccount> findByLedgerIdAndDeletedAtIsNull(UUID ledgerId);

	List<LedgerAccount> findByAccountIdAndDeletedAtIsNull(UUID accountId);

	List<LedgerAccount> findByAccountIdInAndDeletedAtIsNull(Collection<UUID> accountIds);

	Optional<LedgerAccount> findByLedgerIdAndAccountIdAndDeletedAtIsNull(UUID ledgerId, UUID accountId);

	boolean existsByLedgerIdAndAccountIdAndDeletedAtIsNull(UUID ledgerId, UUID accountId);

	long countByLedgerIdAndAccountIdInAndDeletedAtIsNull(UUID ledgerId, Collection<UUID> accountIds);

	boolean existsByAccountIdAndLedgerIdInAndDeletedAtIsNull(UUID accountId, Collection<UUID> ledgerIds);
}
