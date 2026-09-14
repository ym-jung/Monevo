package com.monevo.account.dto;

import com.monevo.account.entity.Account;

public enum CategoryKind {
	EXPENSE, INCOME;

	public static CategoryKind of(Account.Nature nature) {
		return nature == Account.Nature.INCOME ? INCOME : EXPENSE;
	}

	public Account.Nature toNature() {
		return this == INCOME ? Account.Nature.INCOME : Account.Nature.EXPENSE;
	}
}
