package com.monevo.journal.dto;

import com.monevo.user.entity.AppUser;

import java.util.UUID;

public record UserRef(UUID id, String displayName) {
	public static UserRef from(AppUser user) {
		return user == null ? null : new UserRef(user.getId(), user.getDisplayName());
	}
}
