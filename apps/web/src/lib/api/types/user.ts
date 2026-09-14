import type { UserRole, UserStatus } from "./enums";

export interface UserSummary {
	id: string;

	email: string;
	displayName: string;
	role: UserRole;
	status: UserStatus;
	displayCurrency: string | null;
	locale: string | null;
	timezone: string | null;
}

export interface UpdateProfileRequest {
	email?: string;
	displayName?: string;

	displayCurrency?: string;
	locale?: string;
	timezone?: string;
}
