package com.monevo.user.dto;

import com.monevo.user.entity.AppUser;

import java.util.UUID;

public record UserSummary(
	UUID id,
	String email,
	String displayName,
	String role,
	String status,
	String displayCurrency,
	String locale,
	String timezone) {

	public static UserSummary from(AppUser user) {
		return new UserSummary(
			user.getId(),
			user.getEmail(),
			user.getDisplayName(),
			user.getRole().name(),
			user.getStatus().name(),
			user.getDisplayCurrency(),
			user.getLocale(),
			user.getTimezone());
	}
}
