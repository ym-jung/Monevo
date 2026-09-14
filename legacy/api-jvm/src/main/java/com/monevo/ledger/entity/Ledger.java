package com.monevo.ledger.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "ledger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ledger extends UserMeta {

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency", nullable = false, length = 3, updatable = false)
	private String currency;

	@Column(name = "owner_user_id")
	private UUID ownerUserId;

	@Column(name = "timezone", nullable = false, length = 64)
	private String timezone = "UTC";

	@Version
	@Column(name = "version", nullable = false)
	private Long version;

	private Ledger(String name, String currency, UUID ownerUserId, String timezone) {
		this.id = UuidV7.generate();
		this.name = name;
		this.currency = currency;
		this.ownerUserId = ownerUserId;
		this.timezone = timezone;
	}

	public static Ledger create(String name, String currency, UUID ownerUserId, String timezone) {
		return new Ledger(name, currency, ownerUserId, timezone);
	}

	public void rename(String name) {
		this.name = name;
	}
}
