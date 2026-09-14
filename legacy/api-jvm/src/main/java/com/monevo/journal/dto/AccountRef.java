package com.monevo.journal.dto;

import com.monevo.account.entity.Account;

import java.util.UUID;

public record AccountRef(
	UUID id,
	String name,
	String parentName,
	Account.Nature nature,
	Account.Subtype subtype,
	String currency
) {
	public static AccountRef from(Account account, String parentName) {
		return account == null ? null
			: new AccountRef(account.getId(), account.getName(), parentName,
			account.getNature(), account.getSubtype(), account.getCurrency());
	}
}
