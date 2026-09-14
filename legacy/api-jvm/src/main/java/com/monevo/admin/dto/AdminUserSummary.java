package com.monevo.admin.dto;

import com.monevo.user.entity.AppUser;

import java.time.Instant;
import java.util.UUID;

public record AdminUserSummary(
	UUID id,
	String email,
	String displayName,
	String role,
	String status,
	String locale,
	Instant createdAt,
	UUID approvedByUserId,
	String rejectReason) {

	public static AdminUserSummary from(AppUser user) {
		return new AdminUserSummary(
			user.getId(), user.getEmail(), user.getDisplayName(),
			user.getRole().name(), user.getStatus().name(), user.getLocale(),
			user.getCreatedAt(), user.getApprovedByUserId(), user.getRejectReason());
	}
}
