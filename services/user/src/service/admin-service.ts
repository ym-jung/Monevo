import type { AdminUserSummary, UserRole, UserStatus } from "@monevo/contracts";
import { ConflictError, NotFoundError } from "@monevo/http";
import type { PageResponse } from "@monevo/http";
import { page } from "@monevo/http";

import type { UserRow, UserRepository } from "../repository/user-repository.ts";
import type { PrincipalCache } from "./profile-service.ts";

export interface AdminService {
	list(filter: { status?: string; page: number; size: number }): Promise<PageResponse<AdminUserSummary>>;
	approve(adminId: string, targetId: string): Promise<AdminUserSummary>;
	reject(adminId: string, targetId: string, reason: string | null): Promise<AdminUserSummary>;
	changeStatus(adminId: string, targetId: string, next: "SUSPENDED" | "ACTIVE"): Promise<AdminUserSummary>;
	remove(adminId: string, targetId: string): Promise<void>;
}

function toAdminSummary(row: UserRow): AdminUserSummary {
	return {
		id: row.id,
		email: row.email,
		displayName: row.display_name,
		role: row.role as UserRole,
		status: row.status as UserStatus,
		locale: row.locale,
		createdAt: new Date(row.created_at).toISOString(),
		approvedByUserId: row.approved_by_user_id,
		rejectReason: row.reject_reason,
	};
}

export function createAdminService(
	users: UserRepository,
	principals: PrincipalCache,
): AdminService {
	async function requireOther(adminId: string, targetId: string): Promise<UserRow> {
		if (adminId === targetId) throw new ConflictError("CANNOT_MODIFY_SELF");

		const target = await users.findById(targetId);
		if (!target) throw new NotFoundError("USER_NOT_FOUND");

		return target;
	}

	async function requirePendingOther(adminId: string, targetId: string): Promise<UserRow> {
		const target = await requireOther(adminId, targetId);
		if (target.status !== "PENDING") throw new ConflictError("USER_ALREADY_PROCESSED");

		return target;
	}

	async function applyStatus(
		target: UserRow,
		status: string,
		fields: { approvedByUserId?: string; rejectReason?: string | null },
	): Promise<AdminUserSummary> {
		const updated = await users.setStatus(target.id, status, fields);
		if (!updated) throw new NotFoundError("USER_NOT_FOUND");

		principals.evict(target.cognito_sub);

		return toAdminSummary(updated);
	}

	return {
		list: async (filter) => {
			const { items, totalElements } = await users.list(filter);

			return page(items.map(toAdminSummary), filter.page, filter.size, totalElements);
		},

		approve: async (adminId, targetId) => {
			const target = await requirePendingOther(adminId, targetId);

			return applyStatus(target, "ACTIVE", { approvedByUserId: adminId, rejectReason: null });
		},

		reject: async (adminId, targetId, reason) => {
			const target = await requirePendingOther(adminId, targetId);

			return applyStatus(target, "REJECTED", { approvedByUserId: adminId, rejectReason: reason });
		},

		changeStatus: async (adminId, targetId, next) => {
			const target = await requireOther(adminId, targetId);

			return next === "SUSPENDED"
				? applyStatus(target, "SUSPENDED", { approvedByUserId: adminId })
				: applyStatus(target, "ACTIVE", { approvedByUserId: adminId, rejectReason: null });
		},

		remove: async (adminId, targetId) => {
			const target = await requireOther(adminId, targetId);

			if ((await users.ownedLedgerIds(targetId)).length > 0) {
				throw new ConflictError("LEDGER_OWNER_CANNOT_LEAVE");
			}

			await users.leaveEveryLedger(targetId, adminId);
			await users.setStatus(targetId, "DELETED", {});

			principals.evict(target.cognito_sub);
		},
	};
}
