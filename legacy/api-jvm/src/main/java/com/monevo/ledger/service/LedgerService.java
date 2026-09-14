package com.monevo.ledger.service;

import com.monevo.account.service.DefaultCategorySeeder;
import com.monevo.account.service.LedgerAccountLinkService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.journal.service.JournalCascadeService;
import com.monevo.ledger.dto.LedgerCreateRequest;
import com.monevo.ledger.dto.LedgerDetail;
import com.monevo.ledger.dto.LedgerUpdateRequest;
import com.monevo.ledger.entity.Ledger;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.ledger.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LedgerService {
	private final LedgerRepository ledgerRepository;
	private final LedgerMemberService ledgerMemberService;
	private final DefaultCategorySeeder defaultCategorySeeder;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final LedgerInviteService ledgerInviteService;
	private final JournalCascadeService journalCascadeService;
	private final LedgerAccountLinkService ledgerAccountLinkService;

	@Transactional(readOnly = true)
	public String baseCurrencyOf(UUID ledgerId) {
		return ledgerRepository.findByIdAndDeletedAtIsNull(ledgerId)
			.map(Ledger::getCurrency)
			.orElseThrow(() -> new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "ledger not found: " + ledgerId));
	}

	@Transactional(readOnly = true)
	public LedgerDetail getLedger(UUID ledgerId, UUID requesterId) {
		LedgerMember ledgerMember = ledgerAccessChecker.requireMember(ledgerId, requesterId);

		long memberCount = ledgerMemberService.countMembers(ledgerId);

		Ledger ledger = ledgerRepository.findByIdAndDeletedAtIsNull(ledgerId)
			.orElseThrow(() -> new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "ledger not found: " + ledgerId));

		return LedgerDetail.from(ledger, ledgerMember.getRole(), Math.toIntExact(memberCount));
	}

	@Transactional(readOnly = true)
	public List<LedgerDetail> getMyLedgers(UUID userId) {
		Map<UUID, LedgerMember.Role> myRoles = ledgerMemberService.getMyMemberships(userId).stream()
			.collect(Collectors.toMap(LedgerMember::getLedgerId, LedgerMember::getRole));

		if (myRoles.isEmpty()) {
			return List.of();
		}

		Map<UUID, Long> memberCounts = ledgerMemberService.getLedgersMemberCounts(myRoles.keySet());

		return ledgerRepository.findByIdInAndDeletedAtIsNull(List.copyOf(myRoles.keySet())).stream()
			.map(ledger -> LedgerDetail.from(
				ledger,
				myRoles.get(ledger.getId()),
				memberCounts.getOrDefault(ledger.getId(), 0L).intValue()))
			.toList();
	}

	@Transactional
	public LedgerDetail createLedger(LedgerCreateRequest request, UUID userId, String locale) {
		if (!request.confirmCurrencyIrreversible()) {
			log.info("User {} did not confirm the ledger currency cannot be changed after setup", userId);
			throw new ValidationException(ErrorCode.LEDGER_CURRENCY_CONFIRM_REQUIRED,
				"User must confirm the ledger currency cannot be changed after setup");
		}

		requireValidTimezone(request.timezone());

		Ledger ledger = Ledger.create(
			request.name(),
			request.currency(),
			userId,
			request.timezone()
		);
		ledgerRepository.save(ledger);

		ledgerMemberService.saveLedgerMemberForOwner(ledger.getId(), userId);
		defaultCategorySeeder.seed(ledger.getId(), locale);

		return LedgerDetail.from(ledger, LedgerMember.Role.OWNER, 1);
	}

	@Transactional
	public LedgerDetail updateLedgerName(LedgerUpdateRequest request, UUID ledgerId, UUID requesterId) {
		LedgerMember ledgerMember = ledgerAccessChecker.requireOwner(ledgerId, requesterId);
		long memberCount = ledgerMemberService.countMembers(ledgerId);

		Ledger target = ledgerRepository.findByIdAndDeletedAtIsNull(ledgerId).orElse(null);

		if (target == null) {
			log.info("Ledger {} was not found for update the name: requested by {}", ledgerId, requesterId);
			throw new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "The ledger was not found");
		}

		if (!request.version().equals(target.getVersion())) {
			log.info("Stale ledger {} update by {}: sent version {}, current {}",
				ledgerId, requesterId, request.version(), target.getVersion());
			throw new ConflictException(ErrorCode.CONCURRENT_MODIFICATION,
				"ledger " + ledgerId + " was modified by someone else");
		}

		target.rename(request.name());

		ledgerRepository.saveAndFlush(target);

		return LedgerDetail.from(target, ledgerMember.getRole(), Math.toIntExact(memberCount));
	}

	@Transactional
	public void deleteLedger(UUID ledgerId, UUID requesterId) {
		ledgerAccessChecker.requireOwner(ledgerId, requesterId);

		Ledger target = ledgerRepository.findByIdAndDeletedAtIsNull(ledgerId).orElse(null);

		if (target == null) {
			log.info("Cannot find ledger {}, requested by {}", ledgerId, requesterId);
			throw new NotFoundException(ErrorCode.LEDGER_NOT_FOUND, "Could not find the ledger.");
		}

		Instant now = Instant.now();
		journalCascadeService.softDeleteAllInLedger(ledgerId, requesterId, now);
		ledgerInviteService.revokeAllInvites(ledgerId, requesterId);
		ledgerAccountLinkService.unlinkAllInLedger(ledgerId, requesterId, now);
		ledgerMemberService.softDeleteAllMembers(ledgerId, requesterId);

		target.softDelete(requesterId, now);
	}

	private void requireValidTimezone(String timezone) {
		try {
			ZoneId.of(timezone);
		} catch (DateTimeException e) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, "unknown timezone: " + timezone);
		}
	}
}
