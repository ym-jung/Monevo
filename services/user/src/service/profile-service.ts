import type { UpdateProfileRequest, UserRole, UserStatus, UserSummary } from "@monevo/contracts";
import { NotFoundError } from "@monevo/http";

import type { ProfileChanges, UserRow, UserRepository } from "../repository/user-repository.ts";

export interface PrincipalCache {
	evict(cognitoSub: string): void;
}

export interface ProfileService {
	me(userId: string): Promise<UserSummary>;
	update(userId: string, request: UpdateProfileRequest): Promise<UserSummary>;
}

export function toSummary(row: UserRow): UserSummary {
	return {
		id: row.id,
		email: row.email,
		displayName: row.display_name,
		role: row.role as UserRole,
		status: row.status as UserStatus,
		displayCurrency: row.display_currency.trim(),
		locale: row.locale,
		timezone: row.timezone,
	};
}

export function createProfileService(
	users: UserRepository,
	principals: PrincipalCache,
): ProfileService {
	async function require(userId: string): Promise<UserRow> {
		const row = await users.findById(userId);
		if (!row) throw new NotFoundError("USER_NOT_FOUND");

		return row;
	}

	return {
		me: async (userId) => toSummary(await require(userId)),

		update: async (userId, request) => {
			const current = await require(userId);

			const changes: ProfileChanges = {};
			if (request.email) changes.email = request.email;
			if (request.displayName) changes.displayName = request.displayName;
			if (request.displayCurrency) changes.displayCurrency = request.displayCurrency;
			if (request.locale) changes.locale = request.locale;
			if (request.timezone) changes.timezone = request.timezone;

			const principalChanged =
				(changes.email !== undefined && changes.email !== current.email) ||
				(changes.locale !== undefined && changes.locale !== current.locale);

			const updated = await users.updateProfile(userId, changes);
			if (!updated) throw new NotFoundError("USER_NOT_FOUND");

			if (principalChanged) principals.evict(current.cognito_sub);

			return toSummary(updated);
		},
	};
}
