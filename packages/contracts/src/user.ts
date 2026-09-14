import { z } from "zod";

export const userRole = z.enum(["USER", "ADMIN"]);
export const userStatus = z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED", "DELETED"]);

export type UserRole = z.infer<typeof userRole>;
export type UserStatus = z.infer<typeof userStatus>;

export const userSummary = z.object({
	id: z.uuid(),
	email: z.string(),
	displayName: z.string(),
	role: userRole,
	status: userStatus,
	displayCurrency: z.string().length(3),
	locale: z.string(),
	timezone: z.string(),
});

export type UserSummary = z.infer<typeof userSummary>;

export const updateProfileRequest = z.object({
	email: z.email().max(255).nullish(),
	displayName: z.string().trim().min(1).max(60).nullish(),
	displayCurrency: z.string().length(3).nullish(),
	locale: z.string().max(10).nullish(),
	timezone: z.string().max(64).nullish(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequest>;

export const adminUserSummary = z.object({
	id: z.uuid(),
	email: z.string(),
	displayName: z.string(),
	role: userRole,
	status: userStatus,
	locale: z.string(),
	createdAt: z.string(),
	approvedByUserId: z.uuid().nullable(),
	rejectReason: z.string().nullable(),
});

export type AdminUserSummary = z.infer<typeof adminUserSummary>;

export const rejectUserRequest = z.object({
	reason: z.string().max(200).nullish(),
});

export type RejectUserRequest = z.infer<typeof rejectUserRequest>;

export const updateUserStatusRequest = z.object({
	status: z.enum(["SUSPENDED", "ACTIVE"]),
});

export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusRequest>;
