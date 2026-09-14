package com.monevo.ledger.entity;

import com.monevo.common.util.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_invite")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerInvite {

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "ledger_id", nullable = false, updatable = false)
	private UUID ledgerId;

	@Column(name = "code", nullable = false, length = 12, updatable = false)
	private String code;

	@Column(name = "created_by_user_id", nullable = false, updatable = false)
	private UUID createdByUserId;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "max_uses", nullable = false)
	private short maxUses = 1;

	@Column(name = "used_count", nullable = false)
	private short usedCount = 0;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "created_at", insertable = false, updatable = false)
	private Instant createdAt;

	private LedgerInvite(UUID ledgerId, String code, UUID createdByUserId, Instant expiresAt, short maxUses) {
		this.id = UuidV7.generate();
		this.ledgerId = ledgerId;
		this.code = code;
		this.createdByUserId = createdByUserId;
		this.expiresAt = expiresAt;
		this.maxUses = maxUses;
	}

	public static LedgerInvite issue(UUID ledgerId, String code, UUID createdByUserId,
									Instant expiresAt, short maxUses) {
		return new LedgerInvite(ledgerId, code, createdByUserId, expiresAt, maxUses);
	}

	public void revoke(Instant at) {
		this.revokedAt = at;
	}

	public boolean isRevoked() {
		return revokedAt != null;
	}

	public boolean isExpired(Instant now) {
		return expiresAt.isBefore(now);
	}

	public boolean isExhausted() {
		return usedCount >= maxUses;
	}

	public boolean isUsable(Instant now) {
		return !isRevoked() && !isExpired(now) && !isExhausted();
	}
}
