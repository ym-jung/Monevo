package com.monevo.ledger.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerMember extends UserMeta {

	public enum Role {
		OWNER, MEMBER
	}

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "ledger_id", nullable = false, updatable = false)
	private UUID ledgerId;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 10)
	private Role role;

	@Column(name = "joined_via_invite_id")
	private UUID joinedViaInviteId;

	@Column(name = "joined_at", insertable = false, updatable = false)
	private Instant joinedAt;

	private LedgerMember(UUID ledgerId, UUID userId, Role role, UUID joinedViaInviteId) {
		this.id = UuidV7.generate();
		this.ledgerId = ledgerId;
		this.userId = userId;
		this.role = role;
		this.joinedViaInviteId = joinedViaInviteId;
	}

	public static LedgerMember owner(UUID ledgerId, UUID userId) {
		return new LedgerMember(ledgerId, userId, Role.OWNER, null);
	}

	public static LedgerMember joinedByInvite(UUID ledgerId, UUID userId, UUID inviteId) {
		return new LedgerMember(ledgerId, userId, Role.MEMBER, inviteId);
	}

	public boolean isOwner() {
		return role == Role.OWNER;
	}
}
