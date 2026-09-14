import { api } from "@/lib/api/client";
import type { AdminUserSummary, PageResponse, UserStatus } from "@/lib/api/types";

export function listUsers(status?: UserStatus, page = 0, size = 50): Promise<PageResponse<AdminUserSummary>> {
	return api.get<PageResponse<AdminUserSummary>>("admin/users", { query: { status, page, size } });
}

export function approveUser(id: string): Promise<AdminUserSummary> {

	return api.post<AdminUserSummary>(`admin/users/${id}/approve`);
}

export function rejectUser(id: string, reason?: string): Promise<AdminUserSummary> {
	return api.post<AdminUserSummary>(`admin/users/${id}/reject`, { reason: reason?.trim() || undefined });
}

export function deleteUser(id: string): Promise<void> {
	return api.delete(`admin/users/${id}`);
}

export function setUserStatus(id: string, status: "SUSPENDED" | "ACTIVE"): Promise<AdminUserSummary> {
	return api.patch<AdminUserSummary>(`admin/users/${id}/status`, { status });
}
