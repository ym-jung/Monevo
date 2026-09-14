import type { UserStatus } from "@/lib/api/types";
import type { MessageKey } from "@/lib/i18n/messages/en";

export const STATES = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const;
export type State = (typeof STATES)[number];

export type Action = "approve" | "reject" | "suspend" | "reactivate" | "delete";

export const PRIMARY_FOR: Record<State, Action> = {
	PENDING: "approve",
	ACTIVE: "suspend",
	REJECTED: "reactivate",
	SUSPENDED: "reactivate",
};

export const STATE_ICON: Record<State, string> = {
	PENDING: "clock",
	ACTIVE: "circle-check",
	REJECTED: "circle-x",
	SUSPENDED: "circle-pause",
};

export const TONE: Record<UserStatus, "warning" | "success" | "danger" | "neutral"> = {
	PENDING: "warning",
	ACTIVE: "success",
	REJECTED: "danger",
	SUSPENDED: "neutral",
	DELETED: "neutral",
};

export const statusKey = (status: UserStatus) => `status.${status}` as MessageKey;
export const actionKey = (action: Action) =>
	({
		approve: "admin.approve",
		reject: "admin.reject",
		suspend: "admin.suspend",
		reactivate: "admin.reactivate",
		delete: "admin.delete",
	} as const)[action] as MessageKey;
