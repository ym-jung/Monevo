package com.monevo.account.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Immutable
@Table(name = "v_account_balance")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountBalance {

	@Id
	@Column(name = "account_id")
	private UUID accountId;

	@Column(name = "owner_user_id")
	private UUID ownerUserId;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency", length = 3)
	private String currency;

	@Column(name = "balance_minor")
	private long balanceMinor;
}
