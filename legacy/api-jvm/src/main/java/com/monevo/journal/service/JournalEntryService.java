package com.monevo.journal.service;

import com.monevo.account.entity.Account;
import com.monevo.account.service.AccountAccessChecker;
import com.monevo.account.service.CategoryService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.ForbiddenException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.common.response.PageResponse;
import com.monevo.common.util.UuidV7;
import com.monevo.journal.dto.JournalEntryCreateRequest;
import com.monevo.journal.dto.JournalEntryDetail;
import com.monevo.journal.dto.JournalEntryFilter;
import com.monevo.journal.dto.JournalEntrySummary;
import com.monevo.journal.dto.JournalEntryUpdateRequest;
import com.monevo.journal.dto.JournalLineInput;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.repository.JournalEntryRepository;
import com.monevo.journal.repository.JournalEntrySpecs;
import com.monevo.journal.repository.JournalLineRepository;
import com.monevo.ledger.service.LedgerAccessChecker;
import com.monevo.ledger.service.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JournalEntryService {
	private static final int MAX_FILTER_IDS = 50;

	private final JournalEntryRepository journalEntryRepository;
	private final JournalLineRepository journalLineRepository;
	private final JournalEntryWriter journalEntryWriter;
	private final JournalEntryValidator journalEntryValidator;
	private final JournalFxPricer journalFxPricer;
	private final JournalIdempotency journalIdempotency;
	private final JournalEntryProjector journalEntryProjector;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final AccountAccessChecker accountAccessChecker;
	private final LedgerService ledgerService;
	private final CategoryService categoryService;

	public JournalEntryDetail create(JournalEntryCreateRequest request, UUID requesterId) {
		ledgerAccessChecker.requireMember(request.ledgerId(), requesterId);

		UUID clientRequestId = request.clientRequestId() != null ? request.clientRequestId() : UuidV7.generate();
		String requestHash = journalIdempotency.fingerprintOf(request);

		Optional<JournalEntry> replay = journalIdempotency.findReplay(requesterId, clientRequestId);
		if (replay.isPresent()) {
			return detailOf(journalIdempotency.requireSameRequest(replay.get(), requestHash));
		}

		journalEntryValidator.validateShape(request.lines());
		Map<UUID, Account> accounts = journalEntryValidator
			.resolveAccounts(request.lines(), request.ledgerId(), requesterId);

		String baseCurrency = ledgerService.baseCurrencyOf(request.ledgerId());
		List<JournalFxPricer.PricedLine> priced = price(request.lines(), accounts, baseCurrency, request.entryDate());

		JournalEntry entry = JournalEntry.inLedger(request.ledgerId(),
			journalEntryValidator.deriveKind(request.lines(), accounts),
			request.entryDate(), request.description(), request.memo(),
			requesterId, clientRequestId, requestHash);

		try {
			return journalEntryProjector.toDetail(journalEntryWriter.insert(entry, priced), baseCurrency);
		} catch (DataIntegrityViolationException ex) {
			JournalEntry saved = journalIdempotency.recoverFromKeyCollision(ex, requesterId, clientRequestId);
			return detailOf(journalIdempotency.requireSameRequest(saved, requestHash));
		}
	}

	public JournalEntryDetail update(UUID entryId, JournalEntryUpdateRequest request, UUID requesterId) {
		JournalEntry entry = require(entryId);
		requireAccess(entry, requesterId);
		requireCurrentVersion(entry, request.version(), requesterId);

		LocalDate entryDate = request.entryDate() != null ? request.entryDate() : entry.getEntryDate();
		String description = request.description() != null ? request.description() : entry.getDescription();
		String memo = request.memo() != null ? request.memo() : entry.getMemo();

		String baseCurrency = baseCurrencyOf(entry);
		List<JournalFxPricer.PricedLine> priced = null;
		JournalEntry.Kind kind = entry.getKind();

		boolean ratesMayHaveMoved = !entryDate.equals(entry.getEntryDate());
		if (request.lines() != null || ratesMayHaveMoved) {
			List<JournalLineInput> lines = request.lines() != null ? request.lines() : currentLinesAsInput(entryId);
			journalEntryValidator.validateShape(lines);
			Map<UUID, Account> accounts = journalEntryValidator
				.resolveAccounts(lines, entry.getLedgerId(), requesterId);
			priced = price(lines, accounts, baseCurrency, entryDate);
			if (!entry.isOpening()) {
				kind = journalEntryValidator.deriveKind(lines, accounts);
			}
		}

		journalEntryWriter.applyUpdate(entryId, request.version(), entryDate, description, memo, kind,
			priced, requesterId);

		return journalEntryProjector.toDetail(require(entryId), baseCurrency);
	}

	@Transactional(readOnly = true)
	public PageResponse<JournalEntrySummary> getEntries(JournalEntryFilter filter, Pageable pageable, UUID requesterId) {
		if (filter.ledgerId() == null) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, "ledgerId is required");
		}

		ledgerAccessChecker.requireMember(filter.ledgerId(), requesterId);
		requireFilterSize(filter.accountIds(), "accountId");
		requireFilterSize(filter.categoryIds(), "categoryId");
		accountAccessChecker.requireUsableAccounts(filter.accountIds(), filter.ledgerId());

		Set<UUID> targets = new LinkedHashSet<>(filter.accountIds());
		targets.addAll(categoryService.selfAndChildIds(filter.categoryIds(), filter.ledgerId()));

		Specification<JournalEntry> spec = JournalEntrySpecs.notDeleted()
			.and(JournalEntrySpecs.ledgerId(filter.ledgerId()))
			.and(JournalEntrySpecs.dateBetween(filter.from(), filter.to()))
			.and(JournalEntrySpecs.touchesAccount(targets))
			.and(JournalEntrySpecs.kindIn(filter.kinds()));

		Page<JournalEntry> page = journalEntryRepository.findAll(spec, pageable);

		return PageResponse.from(page, journalEntryProjector.toSummaries(page.getContent()));
	}

	@Transactional(readOnly = true)
	public JournalEntryDetail getEntry(UUID entryId, UUID requesterId) {
		JournalEntry entry = require(entryId);
		requireAccess(entry, requesterId);
		return detailOf(entry);
	}

	@Transactional
	public void delete(UUID entryId, UUID requesterId) {
		JournalEntry entry = require(entryId);
		requireAccess(entry, requesterId);

		Instant now = Instant.now();
		journalLineRepository.softDeleteAllByEntryId(entryId, requesterId, now);
		entry.softDelete(requesterId, now);
	}

	private JournalEntryDetail detailOf(JournalEntry entry) {
		return journalEntryProjector.toDetail(entry, baseCurrencyOf(entry));
	}

	private List<JournalFxPricer.PricedLine> price(List<JournalLineInput> lines, Map<UUID, Account> accounts,
													String baseCurrency, LocalDate entryDate) {
		String fallbackCurrency = journalEntryValidator.moneySideCurrency(lines, accounts, baseCurrency);

		List<JournalFxPricer.LineRequest> requests = new ArrayList<>(lines.size());
		for (JournalLineInput line : lines) {
			Account account = accounts.get(line.accountId());
			requests.add(new JournalFxPricer.LineRequest(line.side(), line.accountId(),
				journalEntryValidator.resolveCurrency(line, account, fallbackCurrency),
				line.amountMinor(), line.fxRate(), line.memo()));
		}

		List<JournalFxPricer.PricedLine> priced = journalFxPricer.price(requests, baseCurrency, entryDate);
		journalEntryValidator.requireBalanced(priced, baseCurrency);
		return priced;
	}

	private void requireCurrentVersion(JournalEntry entry, Long sentVersion, UUID requesterId) {
		if (!sentVersion.equals(entry.getVersion())) {
			log.info("Stale entry {} update by {}: sent version {}, current {}",
				entry.getId(), requesterId, sentVersion, entry.getVersion());
			throw new ConflictException(ErrorCode.CONCURRENT_MODIFICATION,
				"Entry " + entry.getId() + " was modified by someone else");
		}
	}

	private List<JournalLineInput> currentLinesAsInput(UUID entryId) {
		return journalLineRepository.findByEntryIdAndDeletedAtIsNullOrderByLineNoAsc(entryId).stream()
			.map(line -> new JournalLineInput(line.getSide(), line.getAccountId(), line.getAmountMinor(),
				line.getCurrency(), null, line.getMemo()))
			.toList();
	}

	private static void requireFilterSize(Collection<?> values, String field) {
		if (values != null && values.size() > MAX_FILTER_IDS) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED,
				field + " accepts at most " + MAX_FILTER_IDS + " values");
		}
	}

	private JournalEntry require(UUID entryId) {
		return journalEntryRepository.findByIdAndDeletedAtIsNull(entryId)
			.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNAL_ENTRY_NOT_FOUND, "Entry was not found."));
	}

	private void requireAccess(JournalEntry entry, UUID requesterId) {
		if (entry.getLedgerId() != null) {
			ledgerAccessChecker.requireMember(entry.getLedgerId(), requesterId);
			return;
		}
		if (!requesterId.equals(entry.getOwnerUserId())) {
			throw new ForbiddenException(ErrorCode.ACCOUNT_NOT_ACCESSIBLE,
				"Opening entries are only visible to the account owner.");
		}
	}

	private String baseCurrencyOf(JournalEntry entry) {
		if (entry.getLedgerId() != null) {
			return ledgerService.baseCurrencyOf(entry.getLedgerId());
		}
		return journalLineRepository.findByEntryIdAndDeletedAtIsNullOrderByLineNoAsc(entry.getId()).stream()
			.map(JournalLine::getCurrency)
			.findFirst()
			.orElse(null);
	}
}
