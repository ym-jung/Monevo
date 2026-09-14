import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "DELETED";
export type UserRole = "USER" | "ADMIN";

export interface CurrentUser {
	id: string;
	cognitoSub: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	locale: string;
}

export interface PrincipalStore {
	findOrProvision(cognitoSub: string, email: string | undefined): Promise<CurrentUser | undefined>;
	evict(cognitoSub: string): void;
}

const CACHE_TTL_MS = 30_000;

const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en";
const DEFAULT_TIMEZONE = "UTC";

interface Row extends Record<string, unknown> {
	id: string;
	cognito_sub: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	locale: string;
	deleted_at: string | null;
}

function toCurrentUser(row: Row): CurrentUser {
	return {
		id: row.id,
		cognitoSub: row.cognito_sub,
		email: row.email,
		role: row.role,
		status: row.status,
		locale: row.locale,
	};
}

export function displayNameFrom(email: string | undefined, cognitoSub: string): string {
	const local = email?.split("@")[0];
	return (local && local.length > 0 ? local : cognitoSub).slice(0, 60);
}

export function placeholderEmail(cognitoSub: string): string {
	return `${cognitoSub}@unknown.local`;
}

export function createPrincipalStore(db: Database, newId: () => string): PrincipalStore {
	const cache = new Map<string, { user: CurrentUser; expiresAt: number }>();

	return {
		findOrProvision: async (cognitoSub, email) => {
			const cached = cache.get(cognitoSub);
			if (cached && Date.now() < cached.expiresAt) return cached.user;

			const existing = await db.execute<Row>(sql`
				SELECT id, cognito_sub, email, role, status, locale, deleted_at
				FROM app_user WHERE cognito_sub = ${cognitoSub}::uuid`);

			const row = existing[0];
			if (row) {
				if (row.deleted_at !== null) return undefined;

				const user = toCurrentUser(row);
				cache.set(cognitoSub, { user, expiresAt: Date.now() + CACHE_TTL_MS });
				return user;
			}

			const address = email ?? placeholderEmail(cognitoSub);
			const created = await db.execute<Row>(sql`
				INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
					display_currency, locale, timezone)
				VALUES (${newId()}::uuid, ${cognitoSub}::uuid, ${address}, ${address.toLowerCase()},
					${displayNameFrom(email, cognitoSub)}, ${DEFAULT_CURRENCY}, ${DEFAULT_LOCALE},
					${DEFAULT_TIMEZONE})
				RETURNING id, cognito_sub, email, role, status, locale, deleted_at`);

			const inserted = created[0];
			if (!inserted) return undefined;

			const user = toCurrentUser(inserted);
			cache.set(cognitoSub, { user, expiresAt: Date.now() + CACHE_TTL_MS });
			return user;
		},

		evict: (cognitoSub) => {
			cache.delete(cognitoSub);
		},
	};
}
