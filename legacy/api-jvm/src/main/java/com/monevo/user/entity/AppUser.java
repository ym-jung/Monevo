package com.monevo.user.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "app_user")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppUser extends UserMeta {

	public enum Role {
		USER, ADMIN
	}

	public enum Status {
		PENDING, ACTIVE, REJECTED, SUSPENDED, DELETED
	}

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "cognito_sub", nullable = false, updatable = false)
	private UUID cognitoSub;

	@Column(name = "email", nullable = false, length = 255)
	private String email;

	@Column(name = "email_normalized", nullable = false, length = 255)
	private String emailNormalized;

	@Column(name = "display_name", nullable = false, length = 60)
	private String displayName;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, length = 20)
	private Role role = Role.USER;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private Status status = Status.PENDING;

	@Column(name = "approved_by_user_id")
	private UUID approvedByUserId;

	@Column(name = "reject_reason", length = 200)
	private String rejectReason;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "display_currency", nullable = false, length = 3)
	private String displayCurrency;

	@Column(name = "locale", nullable = false, length = 10)
	private String locale = "en";

	@Column(name = "timezone", nullable = false, length = 64)
	private String timezone = "UTC";

	@Column(name = "last_login_at")
	private Instant lastLoginAt;

	@Column(name = "cognito_synced_at")
	private Instant cognitoSyncedAt;

	@Version
	@Column(name = "version", nullable = false)
	private Long version;

	private AppUser(UUID cognitoSub, String email, String displayName, String displayCurrency,
					String locale, String timezone) {
		this.id = UuidV7.generate();
		this.cognitoSub = cognitoSub;
		this.email = email;
		this.emailNormalized = normalizeEmail(email);
		this.displayName = displayName;
		this.displayCurrency = displayCurrency;
		this.locale = locale;
		this.timezone = timezone;
	}

	public static AppUser register(UUID cognitoSub, String email, String displayName,
								String displayCurrency, String locale, String timezone) {
		return new AppUser(cognitoSub, email, displayName, displayCurrency, locale, timezone);
	}

	public static String normalizeEmail(String email) {
		return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
	}

	public boolean isAdmin() {
		return role == Role.ADMIN;
	}

	public boolean isActive() {
		return status == Status.ACTIVE;
	}

	public void approve(UUID adminId) {
		this.rejectReason = null;
		this.status = Status.ACTIVE;
		this.approvedByUserId = adminId;
	}

	public void reject(UUID adminId, String reason) {
		this.status = Status.REJECTED;
		this.approvedByUserId = adminId;
		this.rejectReason = reason;
	}

	public void suspend(UUID adminId) {
		this.status = Status.SUSPENDED;
	}

	public void reactivate(UUID adminId) {
		this.status = Status.ACTIVE;
		this.rejectReason = null;
	}

	public void promoteToAdmin(UUID actorId) {
		this.role = Role.ADMIN;
	}

	public void updateProfile(String email, String displayName, String displayCurrency,
							String locale, String timezone) {
		if (email != null) {
			this.email = email;
			this.emailNormalized = normalizeEmail(email);
		}
		if (displayName != null) {
			this.displayName = displayName;
		}
		if (displayCurrency != null) {
			this.displayCurrency = displayCurrency;
		}
		if (locale != null) {
			this.locale = locale;
		}
		if (timezone != null) {
			this.timezone = timezone;
		}
	}

	public void touchLogin(Instant at) {
		this.lastLoginAt = at;
	}

	public void markCognitoSynced(Instant at) {
		this.cognitoSyncedAt = at;
	}

	public void softDelete() {
		this.status = Status.DELETED;
	}
}
