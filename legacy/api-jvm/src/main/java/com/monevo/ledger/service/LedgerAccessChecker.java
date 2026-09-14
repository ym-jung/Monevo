package com.monevo.ledger.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ForbiddenException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.ledger.repository.LedgerMemberRepository;
import com.monevo.ledger.repository.LedgerRepository;
import com.monevo.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LedgerAccessChecker {

	private final AppUserService appUserService;
	private final LedgerRepository ledgerRepository;
	private final LedgerMemberRepository ledgerMemberRepository;

	@Transactional(readOnly = true)
	public LedgerMember requireMember(UUID ledgerId, UUID actorId) {
		requireActiveUser(actorId);
		ledgerRepository.findByIdAndDeletedAtIsNull(ledgerId)
			.orElseThrow(() -> new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "ledger not found: " + ledgerId));

		return ledgerMemberRepository.findByLedgerIdAndUserIdAndDeletedAtIsNull(ledgerId, actorId)
			.orElseThrow(() -> new ForbiddenException(ErrorCode.LEDGER_NOT_MEMBER,
				"user " + actorId + " is not a member of ledger " + ledgerId));
	}

	@Transactional(readOnly = true)
	public LedgerMember requireOwner(UUID ledgerId, UUID actorId) {
		LedgerMember member = requireMember(ledgerId, actorId);
		if (!member.isOwner()) {
			throw new ForbiddenException(ErrorCode.LEDGER_OWNER_REQUIRED,
				"OWNER required on ledger " + ledgerId);
		}
		return member;
	}

	@Transactional(readOnly = true)
	public Set<UUID> accessibleLedgerIds(UUID actorId) {
		if (actorId == null || !appUserService.isActive(actorId)) {
			return Set.of();
		}
		return ledgerMemberRepository.findByUserIdAndDeletedAtIsNull(actorId).stream()
			.map(LedgerMember::getLedgerId)
			.collect(Collectors.toUnmodifiableSet());
	}

	@Transactional(readOnly = true)
	public boolean canReadLedger(UUID ledgerId, UUID actorId) {
		return appUserService.isActive(actorId)
			&& ledgerMemberRepository.existsByLedgerIdAndUserIdAndDeletedAtIsNull(ledgerId, actorId);
	}

	private void requireActiveUser(UUID actorId) {
		if (!appUserService.isActive(actorId)) {
			throw new ForbiddenException(ErrorCode.FORBIDDEN, "not an active user: " + actorId);
		}
	}
}
