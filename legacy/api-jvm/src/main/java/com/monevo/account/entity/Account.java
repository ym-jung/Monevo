package com.monevo.account.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account extends UserMeta {
	public enum Type {
		BANK, CASH, E_MONEY,
		CREDIT_CARD
	}

	public enum Nature {
		ASSET, LIABILITY, EQUITY, EXPENSE, INCOME
	}

	public enum Subtype {
		REAL,
		CATEGORY,
		SYSTEM
	}

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "owner_user_id", updatable = false)
	private UUID ownerUserId;

	@Column(name = "name", nullable = false, length = 50)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", length = 20)
	private Type type;

	@Enumerated(EnumType.STRING)
	@Column(name = "nature", nullable = false, length = 10)
	private Nature nature;

	@Enumerated(EnumType.STRING)
	@Column(name = "subtype", nullable = false, length = 10, updatable = false)
	private Subtype subtype;

	@Column(name = "ledger_id", updatable = false)
	private UUID ledgerId;

	@Column(name = "parent_id", updatable = false)
	private UUID parentId;

	@Column(name = "is_system", nullable = false)
	private boolean isSystem;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency", length = 3, updatable = false)
	private String currency;

	@Column(name = "memo", length = 200)
	private String memo;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder;

	@Column(name = "archived_at")
	private Instant archivedAt;

	@Version
	@Column(name = "version", nullable = false)
	private Long version;

	private Account(UUID ownerUserId, String name, Type type, Nature nature, Subtype subtype,
					UUID ledgerId, UUID parentId, boolean isSystem, String currency,
					String memo, short sortOrder) {
		this.id = UuidV7.generate();
		this.ownerUserId = ownerUserId;
		this.name = name;
		this.type = type;
		this.nature = nature;
		this.subtype = subtype;
		this.ledgerId = ledgerId;
		this.parentId = parentId;
		this.isSystem = isSystem;
		this.currency = currency;
		this.memo = memo;
		this.sortOrder = sortOrder;
	}

	public static Account real(UUID ownerUserId, String name, Type type, String currency,
								String memo, short sortOrder) {
		Nature nature = type == Type.CREDIT_CARD ? Nature.LIABILITY : Nature.ASSET;
		return new Account(ownerUserId, name, type, nature, Subtype.REAL,
			null, null, false, currency, memo, sortOrder);
	}

	public static Account category(UUID ledgerId, UUID parentId, String name, Nature nature,
									short sortOrder, boolean isSystem) {
		return new Account(null, name, null, nature, Subtype.CATEGORY,
			ledgerId, parentId, isSystem, null, null, sortOrder);
	}

	public static Account equity(UUID ownerUserId, String name) {
		return new Account(ownerUserId, name, null, Nature.EQUITY, Subtype.SYSTEM,
			null, null, true, null, null, (short) 0);
	}

	public boolean isOwnedBy(UUID actorId) {
		return ownerUserId != null && ownerUserId.equals(actorId);
	}

	public boolean isReal() {
		return subtype == Subtype.REAL;
	}

	public boolean isCategory() {
		return subtype == Subtype.CATEGORY;
	}

	public boolean isSystemAccount() {
		return subtype == Subtype.SYSTEM;
	}

	public boolean isRoot() {
		return parentId == null;
	}

	public boolean isArchived() {
		return archivedAt != null;
	}

	public void rename(String name) {
		this.name = name;
	}

	public void changeMemo(String memo) {
		this.memo = memo;
	}

	public void reorder(short sortOrder) {
		this.sortOrder = sortOrder;
	}

	public void archive(Instant at) {
		this.archivedAt = at;
	}

	public void unarchive() {
		this.archivedAt = null;
	}
}
