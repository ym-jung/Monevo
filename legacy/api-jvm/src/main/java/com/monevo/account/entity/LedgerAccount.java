package com.monevo.account.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "ledger_account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerAccount extends UserMeta {
	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "ledger_id", nullable = false, updatable = false)
	private UUID ledgerId;

	@Column(name = "account_id", nullable = false, updatable = false)
	private UUID accountId;

	private LedgerAccount(UUID ledgerId, UUID accountId) {
		this.id = UuidV7.generate();
		this.ledgerId = ledgerId;
		this.accountId = accountId;
	}

	public static LedgerAccount create(UUID ledgerId, UUID accountId) {
		return new LedgerAccount(ledgerId, accountId);
	}
}
