package com.monevo.journal.service;

import com.monevo.common.error.DbConstraintErrorMapper;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.journal.dto.JournalEntryCreateRequest;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JournalIdempotency {

	private final JournalEntryRepository journalEntryRepository;
	private final JournalCreateFingerprint journalCreateFingerprint;

	public String fingerprintOf(JournalEntryCreateRequest request) {
		return journalCreateFingerprint.fingerprint(request);
	}

	@Transactional(readOnly = true)
	public Optional<JournalEntry> findReplay(UUID requesterId, UUID clientRequestId) {
		return journalEntryRepository.findByCreatedByUserIdAndClientRequestId(requesterId, clientRequestId);
	}

	@Transactional(readOnly = true)
	public JournalEntry recoverFromKeyCollision(DataIntegrityViolationException ex,
												UUID requesterId, UUID clientRequestId) {
		boolean causedByIdempotencyKey = DbConstraintErrorMapper.resolve(ex)
			.filter(errorCode -> errorCode == ErrorCode.TRANSACTION_IDEMPOTENCY_KEY_REUSED)
			.isPresent();
		if (!causedByIdempotencyKey) {
			throw ex;
		}
		return journalEntryRepository.findByCreatedByUserIdAndClientRequestId(requesterId, clientRequestId)
			.orElseThrow(() -> ex);
	}

	public JournalEntry requireSameRequest(JournalEntry existing, String requestHash) {
		if (!existing.getCreateRequestHash().equals(requestHash) || existing.getDeletedAt() != null) {
			throw new ConflictException(ErrorCode.TRANSACTION_IDEMPOTENCY_KEY_REUSED,
				"The entry request key has already been used");
		}
		return existing;
	}
}
