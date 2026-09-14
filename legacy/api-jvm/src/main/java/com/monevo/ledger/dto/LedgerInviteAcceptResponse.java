package com.monevo.ledger.dto;

import com.monevo.ledger.entity.Ledger;
import com.monevo.ledger.entity.LedgerMember;

import java.util.UUID;

public record LedgerInviteAcceptResponse(
	UUID ledgerId,
	String name,
	String currency,
	LedgerMember.Role role
) {
	public static LedgerInviteAcceptResponse of(Ledger ledger, LedgerMember.Role role) {
		return new LedgerInviteAcceptResponse(
			ledger.getId(),
			ledger.getName(),
			ledger.getCurrency(),
			role
		);
	}
}
