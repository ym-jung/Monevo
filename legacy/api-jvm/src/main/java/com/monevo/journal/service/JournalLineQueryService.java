package com.monevo.journal.service;

import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.repository.JournalLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JournalLineQueryService {
	private final JournalLineRepository journalLineRepository;

	@Transactional(readOnly = true)
	public boolean hasAnyLine(UUID accountId) {
		return journalLineRepository.existsLiveLineForAccount(accountId);
	}

	@Transactional(readOnly = true)
	public boolean hasNonOpeningLine(UUID accountId) {
		return journalLineRepository.existsLineForAccountExcludingKind(accountId, JournalEntry.Kind.OPENING);
	}
}
