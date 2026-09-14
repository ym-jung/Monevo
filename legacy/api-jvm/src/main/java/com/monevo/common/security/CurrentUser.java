package com.monevo.common.security;

import java.util.UUID;

public record CurrentUser(
	UUID id,
	UUID cognitoSub,
	String email,
	Role role,
	Status status,
	String locale) {

	public enum Role {
		ADMIN, USER
	}

	public enum Status {
		PENDING, ACTIVE, REJECTED, SUSPENDED, DELETED
	}

	public boolean isAdmin() {
		return role == Role.ADMIN;
	}

	public boolean isActive() {
		return status == Status.ACTIVE;
	}
}
