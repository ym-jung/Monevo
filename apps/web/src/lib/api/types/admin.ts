import type { UserRole, UserStatus } from "./enums";

export interface AdminUserSummary {
	id: string;
	email: string;
	displayName: string;
	role: UserRole;
	status: UserStatus;
	locale: string;
	createdAt: string;
	approvedByUserId: string | null;
	rejectReason: string | null;
}

export interface RejectUserRequest {

	reason?: string;
}

export interface UpdateUserStatusRequest {
	status: "SUSPENDED" | "ACTIVE";
}
