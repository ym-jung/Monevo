package com.monevo.account.repository;

import com.monevo.account.entity.AccountBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountBalanceRepository extends JpaRepository<AccountBalance, UUID> {

	Optional<AccountBalance> findByAccountId(UUID accountId);

	List<AccountBalance> findByAccountIdIn(List<UUID> accountIds);
}
