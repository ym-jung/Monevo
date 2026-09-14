package com.monevo.ledger.service;

import com.monevo.account.service.LedgerAccountLinkService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.ForbiddenException;
import com.monevo.ledger.dto.LedgerMemberDetail;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.ledger.repository.LedgerMemberRepository;
import com.monevo.ledger.repository.LedgerMemberRepository.LedgerMemberCount;
import com.monevo.user.entity.AppUser;
import com.monevo.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LedgerMemberService {
	private final LedgerMemberRepository ledgerMemberRepository;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final AppUserService appUserService;
	private final LedgerAccountLinkService ledgerAccountLinkService;

	@Transactional(readOnly = true)
	public List<LedgerMember> getMyMemberships(UUID userId) {
		return ledgerMemberRepository.findByUserIdAndDeletedAtIsNull(userId);
	}

	@Transactional(readOnly = true)
	public long countMembers(UUID ledgerId) {
		return ledgerMemberRepository.countByLedgerIdAndDeletedAtIsNull(ledgerId);
	}

	@Transactional(readOnly = true)
	public Map<UUID, Long> getLedgersMemberCounts(Collection<UUID> ledgerIds) {
		if (ledgerIds.isEmpty()) {
			return Map.of();
		}
		return ledgerMemberRepository.countByLedgerIdIn(ledgerIds).stream()
			.collect(Collectors.toMap(LedgerMemberCount::getLedgerId, LedgerMemberCount::getMemberCount));
	}

	@Transactional
	public void saveLedgerMemberForOwner(UUID ledgerId, UUID userId) {
		ledgerMemberRepository.save(LedgerMember.owner(ledgerId, userId));
	}

	@Transactional
	public void saveLedgerMemberForMember(UUID ledgerId, UUID userId, UUID inviteId) {
		ledgerMemberRepository.save(LedgerMember.joinedByInvite(ledgerId, userId, inviteId));
	}

	@Transactional
	public void evictMemberFromLedger(UUID ledgerId, UUID targetUserId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		LedgerMember target = ledgerMemberRepository
			.findByLedgerIdAndUserIdAndDeletedAtIsNull(ledgerId, targetUserId)
			.orElseThrow(() -> new ForbiddenException(ErrorCode.LEDGER_NOT_MEMBER,
				"user " + targetUserId + " is not a member of ledger " + ledgerId));

		if (target.isOwner()) {
			throw new ConflictException(ErrorCode.LEDGER_OWNER_CANNOT_LEAVE,
				"the owner of ledger " + ledgerId + " cannot be removed");
		}

		Instant now = Instant.now();
		ledgerAccountLinkService.unlinkOwnedAccounts(ledgerId, targetUserId, requesterId, now);
		target.softDelete(requesterId, now);
		log.info("user {} evicted {} from ledger {}", requesterId, targetUserId, ledgerId);
	}

	@Transactional(readOnly = true)
	public List<UUID> ownedLedgerIds(UUID userId) {
		return ledgerMemberRepository.findByUserIdAndDeletedAtIsNull(userId).stream()
			.filter(LedgerMember::isOwner)
			.map(LedgerMember::getLedgerId)
			.toList();
	}

	@Transactional
	public void removeFromEveryLedger(UUID userId, UUID actorId) {
		Instant now = Instant.now();
		for (LedgerMember membership : ledgerMemberRepository.findByUserIdAndDeletedAtIsNull(userId)) {
			ledgerAccountLinkService.unlinkOwnedAccounts(membership.getLedgerId(), userId, actorId, now);
			membership.softDelete(actorId, now);
		}
	}

	@Transactional
	public void softDeleteAllMembers(UUID ledgerId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		Instant now = Instant.now();
		for (LedgerMember member : ledgerMemberRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId)) {
			member.softDelete(requesterId, now);
		}
	}

	@Transactional
	public void exitFromLedger(UUID ledgerId, UUID requesterId) {
		LedgerMember me = ledgerAccessChecker.requireMember(ledgerId, requesterId);

		if (me.isOwner()) {
			throw new ConflictException(ErrorCode.LEDGER_OWNER_CANNOT_LEAVE,
				"the owner cannot leave ledger " + ledgerId);
		}

		Instant now = Instant.now();
		ledgerAccountLinkService.unlinkOwnedAccounts(ledgerId, requesterId, requesterId, now);
		me.softDelete(requesterId, now);
		log.info("user {} left ledger {}", requesterId, ledgerId);
	}

	@Transactional(readOnly = true)
	public List<LedgerMemberDetail> getLedgerMembers(UUID ledgerId, UUID requesterId) {
		ledgerAccessChecker.requireMember(ledgerId, requesterId);

		List<LedgerMember> members = ledgerMemberRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId);
		if (members.isEmpty()) {
			return List.of();
		}

		Map<UUID, AppUser> users = appUserService.usersByIds(
			members.stream().map(LedgerMember::getUserId).toList());

		return members.stream()
			.map(member -> LedgerMemberDetail.from(member, displayNameOf(users, member.getUserId())))
			.toList();
	}

	private static String displayNameOf(Map<UUID, AppUser> users, UUID userId) {
		AppUser user = users.get(userId);
		return user == null ? null : user.getDisplayName();
	}
}
