package com.monevo.journal.service;

import com.monevo.journal.repository.JournalEntryRepository;
import com.monevo.journal.repository.JournalLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JournalCascadeService {

	private final JournalEntryRepository journalEntryRepository;
	private final JournalLineRepository journalLineRepository;

	@Transactional
	public void softDeleteAllInLedger(UUID ledgerId, UUID actorId, Instant at) {
		journalLineRepository.softDeleteAllByLedgerId(ledgerId, actorId, at);
		journalEntryRepository.softDeleteAllByLedgerId(ledgerId, actorId, at);
	}
}
