package com.monevo.account.dto;

import com.monevo.account.entity.Account;
import com.monevo.account.entity.AccountBalance;

import java.util.List;
import java.util.UUID;

public record AccountDetail(
	UUID id,
	String name,
	Account.Type type,
	Account.Nature nature,
	Account.Subtype subtype,
	String currency,
	UUID ownerUserId,
	String ownerDisplayName,
	List<UUID> ledgerIds,
	long balanceMinor,
	boolean archived,
	Long version
) {
	public static AccountDetail from(Account account, AccountBalance balance, String ownerDisplayName,
									List<UUID> ledgerIds) {
		return new AccountDetail(
			account.getId(),
			account.getName(),
			account.getType(),
			account.getNature(),
			account.getSubtype(),
			account.getCurrency(),
			account.getOwnerUserId(),
			ownerDisplayName,
			ledgerIds == null ? List.of() : ledgerIds,
			balance != null ? balance.getBalanceMinor() : 0L,
			account.isArchived(),
			account.getVersion()
		);
	}
}
