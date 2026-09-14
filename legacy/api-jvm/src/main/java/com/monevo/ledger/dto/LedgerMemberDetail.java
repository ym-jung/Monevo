package com.monevo.ledger.dto;

import com.monevo.ledger.entity.LedgerMember;

import java.time.Instant;
import java.util.UUID;

public record LedgerMemberDetail(
	UUID id,
	UUID ledgerId,
	UUID userId,
	String displayName,
	LedgerMember.Role role,
	Instant joinedAt
) {
	public static LedgerMemberDetail from(LedgerMember ledgerMember, String displayName) {
		return new LedgerMemberDetail(
			ledgerMember.getId(),
			ledgerMember.getLedgerId(),
			ledgerMember.getUserId(),
			displayName,
			ledgerMember.getRole(),
			ledgerMember.getJoinedAt()
		);
	}
}
