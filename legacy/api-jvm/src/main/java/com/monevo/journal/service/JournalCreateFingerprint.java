package com.monevo.journal.service;

import com.monevo.journal.dto.JournalEntryCreateRequest;
import com.monevo.journal.dto.JournalLineInput;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Component
public class JournalCreateFingerprint {
	private static final String HASH_ALGORITHM = "SHA-256";
	private static final String SCHEMA_VERSION = "journal-entry-create-v2";

	public String fingerprint(JournalEntryCreateRequest request) {
		MessageDigest digest = newDigest();

		update(digest, "schema", SCHEMA_VERSION);
		update(digest, "ledgerId", stringOf(request.ledgerId()));
		update(digest, "entryDate", stringOf(request.entryDate()));
		update(digest, "description", request.description());
		update(digest, "memo", request.memo());

		List<JournalLineInput> lines = request.lines() == null ? List.of() : request.lines();
		update(digest, "lineCount", Integer.toString(lines.size()));
		for (JournalLineInput line : lines) {
			update(digest, "side", stringOf(line.side()));
			update(digest, "accountId", stringOf(line.accountId()));
			update(digest, "amountMinor", Long.toString(line.amountMinor()));
			update(digest, "currency", line.currency());
			update(digest, "fxRate", decimalOf(line.fxRate()));
			update(digest, "lineMemo", line.memo());
		}

		return HexFormat.of().formatHex(digest.digest());
	}

	private static MessageDigest newDigest() {
		try {
			return MessageDigest.getInstance(HASH_ALGORITHM);
		} catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 is not available", ex);
		}
	}

	private static void update(MessageDigest digest, String fieldName, String value) {
		updateChunk(digest, fieldName);

		if (value == null) {
			updateLength(digest, -1);
			return;
		}

		updateChunk(digest, value);
	}

	private static void updateChunk(MessageDigest digest, String value) {
		byte[] bytes = value.getBytes(StandardCharsets.UTF_8);

		updateLength(digest, bytes.length);
		digest.update(bytes);
	}

	private static void updateLength(MessageDigest digest, int length) {
		digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(length).array());
	}

	private static String stringOf(Object value) {
		return value == null ? null : value.toString();
	}

	private static String decimalOf(BigDecimal value) {
		if (value == null) {
			return null;
		}

		return value.stripTrailingZeros().toPlainString();
	}
}
