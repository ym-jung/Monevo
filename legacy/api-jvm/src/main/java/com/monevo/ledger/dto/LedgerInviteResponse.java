package com.monevo.ledger.dto;

import com.monevo.ledger.entity.LedgerInvite;

import java.time.Instant;
import java.util.UUID;

public record LedgerInviteResponse(
	UUID id,
	String code,
	Instant expiresAt,
	short maxUses,
	short usedCount
) {
	public static LedgerInviteResponse from(LedgerInvite ledgerInvite) {
		return new LedgerInviteResponse(
			ledgerInvite.getId(),
			ledgerInvite.getCode(),
			ledgerInvite.getExpiresAt(),
			ledgerInvite.getMaxUses(),
			ledgerInvite.getUsedCount()
		);
	}
}
