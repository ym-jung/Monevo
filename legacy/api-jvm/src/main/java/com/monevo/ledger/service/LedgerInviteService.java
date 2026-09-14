package com.monevo.ledger.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.GoneException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.ledger.dto.*;
import com.monevo.ledger.entity.Ledger;
import com.monevo.ledger.entity.LedgerInvite;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.ledger.repository.LedgerInviteRepository;
import com.monevo.ledger.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class LedgerInviteService {
	private final LedgerInviteRepository ledgerInviteRepository;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final LedgerMemberService ledgerMemberService;
	private final LedgerRepository ledgerRepository;

	private static final String CHAR_POOL = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
	private static final int CODE_LENGTH = 8;
	private static final int MAX_CODE_ATTEMPTS = 10;

	private static final int DEFAULT_EXPIRATION_DAYS = 7;
	private static final short DEFAULT_MAX_USAGE = 1;

	private static final SecureRandom secureRandom = new SecureRandom();

	@Transactional
	public void deleteInvite(UUID ledgerId, UUID inviteId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		LedgerInvite invite = ledgerInviteRepository.findByIdAndLedgerId(inviteId, ledgerId).orElse(null);

		if (invite == null) {
			log.info("Invitation {} not found on ledger {}: requested by {}", inviteId, ledgerId, requesterId);
			throw new NotFoundException(ErrorCode.INVITE_NOT_FOUND, "The invitation is not existed");
		}

		invite.revoke(Instant.now());
	}

	@Transactional
	public void revokeAllInvites(UUID ledgerId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		Instant now = Instant.now();
		for (LedgerInvite invite : ledgerInviteRepository.findByLedgerIdOrderByCreatedAtDesc(ledgerId)) {
			if (invite.isUsable(now)) {
				invite.revoke(now);
			}
		}
	}

	@Transactional(readOnly = true)
	public List<LedgerInviteResponse> getValidInviteCodes(UUID ledgerId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		Instant now = Instant.now();
		return ledgerInviteRepository.findByLedgerIdOrderByCreatedAtDesc(ledgerId).stream()
			.filter(ledgerInvite -> ledgerInvite.isUsable(now))
			.map(LedgerInviteResponse::from).toList();
	}

	@Transactional
	public LedgerInviteAcceptResponse useInviteCode(String invitationCode, UUID requesterId) {
		String normalizedCode = invitationCode == null ? "" : invitationCode.trim().toUpperCase(Locale.ROOT);

		LedgerInvite ledgerInvite = ledgerInviteRepository.findByCode(normalizedCode).orElseThrow(() -> {
			log.info("User {} used invalid invitation code: {}", requesterId, normalizedCode);
			return new NotFoundException(ErrorCode.INVITE_NOT_FOUND, "Requested invitation code is not valid");
		});

		if (ledgerInvite.isRevoked()) {
			log.info("User {} used revoked invitation code: {}", requesterId, normalizedCode);
			throw new GoneException(ErrorCode.INVITE_REVOKED, "The invitation code revoked.");
		}

		Instant now = Instant.now();

		if (ledgerInvite.isExpired(now)) {
			log.info("User {} used expired invitation code: {}", requesterId, normalizedCode);
			throw new GoneException(ErrorCode.INVITE_EXPIRED, "The invitation code expired.");
		}

		if (ledgerInvite.isExhausted()) {
			log.info("User {} used exhausted invitation code: {}", requesterId, normalizedCode);
			throw new ConflictException(ErrorCode.INVITE_EXHAUSTED, "The invitation code already used over maximum usage.");
		}

		if (ledgerAccessChecker.canReadLedger(ledgerInvite.getLedgerId(), requesterId)) {
			log.info("User {} is already a member of the ledger {}", requesterId, ledgerInvite.getLedgerId());
			throw new ConflictException(ErrorCode.INVITE_ALREADY_MEMBER, "You are already a member of this ledger.");
		}

		int updatedRows = ledgerInviteRepository.incrementUsedCount(ledgerInvite.getId(), now);

		if (updatedRows == 0) {
			log.info("Invitation code {} exhausted during concurrent use", normalizedCode);
			throw new ConflictException(ErrorCode.INVITE_EXHAUSTED, "The invitation code is no longer available.");
		}

		ledgerMemberService.saveLedgerMemberForMember(ledgerInvite.getLedgerId(), requesterId, ledgerInvite.getId());

		Ledger ledger = ledgerRepository.findByIdAndDeletedAtIsNull(ledgerInvite.getLedgerId())
			.orElseThrow(() -> new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "Ledger not found: " + ledgerInvite.getLedgerId()));

		return LedgerInviteAcceptResponse.of(ledger, LedgerMember.Role.MEMBER);
	}

	@Transactional
	public LedgerInviteResponse issueInviteCode(UUID ledgerId, UUID requesterId, LedgerInviteRequest request) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		String invitationCode = generateCode();

		int expiresInDays = (request != null && request.expiresInDays() != null)
			? request.expiresInDays()
			: DEFAULT_EXPIRATION_DAYS;

		short maxUses = (request != null && request.maxUses() != null)
			? request.maxUses()
			: DEFAULT_MAX_USAGE;

		LedgerInvite ledgerInvite = LedgerInvite.issue(
			ledgerId,
			invitationCode,
			requesterId,
			Instant.now().plus(expiresInDays, ChronoUnit.DAYS),
			maxUses
		);

		ledgerInviteRepository.save(ledgerInvite);

		return LedgerInviteResponse.from(ledgerInvite);
	}

	private String generateCode() {
		for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
			StringBuilder codeBuilder = new StringBuilder(CODE_LENGTH);

			for (int i = 0; i < CODE_LENGTH; i++) {
				int randomIndex = secureRandom.nextInt(CHAR_POOL.length());
				codeBuilder.append(CHAR_POOL.charAt(randomIndex));
			}

			String newCode = codeBuilder.toString();

			if (!ledgerInviteRepository.existsByCode(newCode)) {
				return newCode;
			}
		}

		throw new IllegalStateException("could not generate a unique invite code in "
			+ MAX_CODE_ATTEMPTS + " attempts");
	}
}
