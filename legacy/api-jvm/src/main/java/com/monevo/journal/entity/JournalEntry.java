package com.monevo.journal.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "journal_entry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JournalEntry extends UserMeta {
	public enum Kind {
		EXPENSE, INCOME, TRANSFER, SPLIT, OPENING
	}

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "ledger_id", updatable = false)
	private UUID ledgerId;

	@Column(name = "owner_user_id", updatable = false)
	private UUID ownerUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "kind", nullable = false, length = 10)
	private Kind kind;

	@Column(name = "entry_date", nullable = false)
	private LocalDate entryDate;

	@Column(name = "description", nullable = false, length = 200)
	private String description;

	@Column(name = "memo", columnDefinition = "text")
	private String memo;

	@Column(name = "created_by_user_id", nullable = false, updatable = false)
	private UUID createdByUserId;

	@Column(name = "client_request_id", nullable = false, updatable = false)
	private UUID clientRequestId;

	@Column(name = "create_request_hash", nullable = false, updatable = false, length = 64)
	private String createRequestHash;

	@Version
	@Column(name = "version", nullable = false)
	private Long version;

	private JournalEntry(UUID ledgerId, UUID ownerUserId, Kind kind, LocalDate entryDate,
						String description, String memo, UUID createdByUserId,
						UUID clientRequestId, String createRequestHash) {
		this.id = UuidV7.generate();
		this.ledgerId = ledgerId;
		this.ownerUserId = ownerUserId;
		this.kind = kind;
		this.entryDate = entryDate;
		this.description = description;
		this.memo = memo;
		this.createdByUserId = createdByUserId;
		this.clientRequestId = clientRequestId;
		this.createRequestHash = createRequestHash;
	}

	public static JournalEntry inLedger(UUID ledgerId, Kind kind, LocalDate entryDate, String description,
										String memo, UUID createdByUserId, UUID clientRequestId,
										String createRequestHash) {
		return new JournalEntry(ledgerId, null, kind, entryDate, description, memo,
			createdByUserId, clientRequestId, createRequestHash);
	}

	public static JournalEntry opening(UUID ownerUserId, LocalDate entryDate, String description,
										UUID clientRequestId, String createRequestHash) {
		return new JournalEntry(null, ownerUserId, Kind.OPENING, entryDate, description, null,
			ownerUserId, clientRequestId, createRequestHash);
	}

	public boolean isOpening() {
		return kind == Kind.OPENING;
	}

	public void reclassify(Kind kind) {
		this.kind = kind;
	}

	public void edit(LocalDate entryDate, String description, String memo) {
		this.entryDate = entryDate;
		this.description = description;
		this.memo = memo;
	}
}
