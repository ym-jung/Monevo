package com.monevo.journal.repository;

import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.Collection;
import java.util.UUID;

public final class JournalEntrySpecs {
	private JournalEntrySpecs() {
	}

	private static Specification<JournalEntry> any() {
		return (root, query, cb) -> cb.conjunction();
	}

	public static Specification<JournalEntry> notDeleted() {
		return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
	}

	public static Specification<JournalEntry> ledgerId(UUID ledgerId) {
		return (root, query, cb) -> cb.equal(root.get("ledgerId"), ledgerId);
	}

	public static Specification<JournalEntry> dateBetween(LocalDate from, LocalDate to) {
		if (from == null && to == null) {
			return any();
		}
		if (from == null) {
			return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("entryDate"), to);
		}
		if (to == null) {
			return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("entryDate"), from);
		}
		return (root, query, cb) -> cb.between(root.get("entryDate"), from, to);
	}

	public static Specification<JournalEntry> touchesAccount(Collection<UUID> accountIds) {
		if (accountIds == null || accountIds.isEmpty()) {
			return any();
		}
		return (root, query, cb) -> {
			Subquery<UUID> lines = query.subquery(UUID.class);
			var line = lines.from(JournalLine.class);
			lines.select(line.get("entryId"))
				.where(cb.and(
					cb.equal(line.get("entryId"), root.get("id")),
					cb.isNull(line.get("deletedAt")),
					line.get("accountId").in(accountIds)));
			return cb.exists(lines);
		};
	}

	public static Specification<JournalEntry> kindIn(Collection<JournalEntry.Kind> kinds) {
		if (kinds == null || kinds.isEmpty()) {
			return any();
		}
		return (root, query, cb) -> root.get("kind").in(kinds);
	}

}
