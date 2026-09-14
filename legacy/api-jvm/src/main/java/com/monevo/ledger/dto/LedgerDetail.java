package com.monevo.ledger.dto;

import com.monevo.ledger.entity.Ledger;
import com.monevo.ledger.entity.LedgerMember;

import java.time.Instant;
import java.util.UUID;

public record LedgerDetail(
	UUID id,
	String name,
	String currency,
	LedgerMember.Role myRole,
	int memberCount,
	UUID ownerUserId,
	Instant createdAt,
	Long version
) {
	public static LedgerDetail from(Ledger ledger, LedgerMember.Role role, int memberCount) {
		return new LedgerDetail(
			ledger.getId(),
			ledger.getName(),
			ledger.getCurrency(),
			role,
			memberCount,
			ledger.getOwnerUserId(),
			ledger.getCreatedAt(),
			ledger.getVersion()
		);
	}
}
