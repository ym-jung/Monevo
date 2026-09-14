package com.monevo.journal;

import com.monevo.journal.dto.JournalEntryCreateRequest;
import com.monevo.journal.dto.JournalLineInput;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.service.JournalCreateFingerprint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JournalCreateFingerprintTest {
	private static final UUID CLIENT_REQUEST_ID_1 = UUID.fromString("019d2f10-0000-7000-8000-000000000001");
	private static final UUID CLIENT_REQUEST_ID_2 = UUID.fromString("019d2f10-0000-7000-8000-000000000002");
	private static final UUID LEDGER_ID = UUID.fromString("019d2f10-0000-7000-8000-000000000010");
	private static final UUID ACCOUNT_ID = UUID.fromString("019d2f10-0000-7000-8000-000000000020");
	private static final UUID CATEGORY_ID = UUID.fromString("019d2f10-0000-7000-8000-000000000030");
	private static final UUID OTHER_CATEGORY_ID = UUID.fromString("019d2f10-0000-7000-8000-000000000031");

	private final JournalCreateFingerprint fingerprint = new JournalCreateFingerprint();

	@Test
	@DisplayName("the same content hashes the same, whatever scale the rate arrived in")
	void sameContentSameHash() {
		assertThat(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_1, new BigDecimal("150.0"), "점심", 1_200)))
			.isEqualTo(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_2, new BigDecimal("150.00"), "점심", 1_200)));
	}

	@Test
	@DisplayName("the idempotency key itself is not part of the hash")
	void clientRequestIdIsNotHashed() {
		assertThat(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_1, null, "점심", 1_200)))
			.isEqualTo(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_2, null, "점심", 1_200)));
	}

	@Test
	@DisplayName("a different amount is a different request")
	void amountChangesTheHash() {
		assertThat(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_1, null, "점심", 1_200)))
			.isNotEqualTo(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_1, null, "점심", 1_300)));
	}

	@Test
	@DisplayName("adding a split line is a different request")
	void lineCountChangesTheHash() {
		JournalEntryCreateRequest two = request(CLIENT_REQUEST_ID_1, null, "마트", 2_000);
		JournalEntryCreateRequest three = new JournalEntryCreateRequest(CLIENT_REQUEST_ID_1, LEDGER_ID,
			LocalDate.of(2026, 8, 5), "마트", null,
			List.of(
				new JournalLineInput(JournalLine.Side.DEBIT, CATEGORY_ID, 1_200, null, null, null),
				new JournalLineInput(JournalLine.Side.DEBIT, OTHER_CATEGORY_ID, 800, null, null, null),
				new JournalLineInput(JournalLine.Side.CREDIT, ACCOUNT_ID, 2_000, null, null, null)));

		assertThat(fingerprint.fingerprint(two)).isNotEqualTo(fingerprint.fingerprint(three));
	}

	@Test
	@DisplayName("swapping which side an account sits on is a different request")
	void sideChangesTheHash() {
		JournalEntryCreateRequest flipped = new JournalEntryCreateRequest(CLIENT_REQUEST_ID_1, LEDGER_ID,
			LocalDate.of(2026, 8, 5), "점심", null,
			List.of(
				new JournalLineInput(JournalLine.Side.CREDIT, CATEGORY_ID, 1_200, null, null, null),
				new JournalLineInput(JournalLine.Side.DEBIT, ACCOUNT_ID, 1_200, null, null, null)));

		assertThat(fingerprint.fingerprint(request(CLIENT_REQUEST_ID_1, null, "점심", 1_200)))
			.isNotEqualTo(fingerprint.fingerprint(flipped));
	}

	private static JournalEntryCreateRequest request(UUID clientRequestId, BigDecimal fxRate,
													String description, long amountMinor) {
		return new JournalEntryCreateRequest(clientRequestId, LEDGER_ID, LocalDate.of(2026, 8, 5),
			description, "회사 근처",
			List.of(
				new JournalLineInput(JournalLine.Side.DEBIT, CATEGORY_ID, amountMinor, null, fxRate, null),
				new JournalLineInput(JournalLine.Side.CREDIT, ACCOUNT_ID, amountMinor, null, fxRate, null)));
	}
}
