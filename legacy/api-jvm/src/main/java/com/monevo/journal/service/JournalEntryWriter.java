package com.monevo.journal.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.repository.JournalEntryRepository;
import com.monevo.journal.repository.JournalLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JournalEntryWriter {
	private final JournalEntryRepository journalEntryRepository;
	private final JournalLineRepository journalLineRepository;

	@Transactional
	public JournalEntry insert(JournalEntry entry, List<JournalFxPricer.PricedLine> lines) {
		JournalEntry saved = journalEntryRepository.saveAndFlush(entry);
		writeLines(saved.getId(), lines);
		return saved;
	}

	@Transactional
	public void applyUpdate(UUID entryId, Long expectedVersion, LocalDate entryDate, String description,
							String memo, JournalEntry.Kind kind, List<JournalFxPricer.PricedLine> lines,
							UUID actorId) {
		JournalEntry entry = journalEntryRepository.findByIdAndDeletedAtIsNull(entryId)
			.orElseThrow(() -> new NotFoundException(ErrorCode.JOURNAL_ENTRY_NOT_FOUND, "Entry was not found."));

		if (!expectedVersion.equals(entry.getVersion())) {
			throw new ConflictException(ErrorCode.CONCURRENT_MODIFICATION,
				"Entry " + entryId + " was modified by someone else");
		}

		entry.edit(entryDate, description, memo);
		entry.reclassify(kind);

		if (lines != null) {
			journalLineRepository.softDeleteAllByEntryId(entryId, actorId, Instant.now());
			journalLineRepository.flush();
			writeLines(entryId, lines);
		}

		journalEntryRepository.saveAndFlush(entry);
	}

	private void writeLines(UUID entryId, List<JournalFxPricer.PricedLine> lines) {
		short lineNo = 0;
		for (JournalFxPricer.PricedLine line : lines) {
			journalLineRepository.save(JournalLine.of(entryId, lineNo++, line.side(), line.accountId(),
				line.currency(), line.amountMinor(), line.fxRate(), line.baseAmountMinor(),
				line.source(), line.asOf(), line.memo()));
		}
		journalLineRepository.flush();
	}
}
