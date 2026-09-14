"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { AdminUserSummary } from "@/lib/api/types";

import { approveUser, deleteUser, listUsers, rejectUser, setUserStatus } from "./api";
import { STATES, type Action, type State } from "./queueVocabulary";

const PAGE_SIZE = 100;

export function useApprovalQueue(initial: AdminUserSummary[]) {
	const [status, setStatus] = useState<State>("PENDING");
	const [users, setUsers] = useState<AdminUserSummary[]>(initial);
	const [counts, setCounts] = useState<Partial<Record<State, number>>>({});
	const [total, setTotal] = useState(0);
	const [focusedId, setFocusedId] = useState<string | null>(initial[0]?.id ?? null);
	const [ticked, setTicked] = useState<Set<string>>(new Set());
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const pages = await Promise.all(STATES.map((state) => listUsers(state, 0, PAGE_SIZE)));
			const byState = Object.fromEntries(STATES.map((state, i) => [state, pages[i]])) as Record<State, (typeof pages)[number]>;

			setCounts(Object.fromEntries(STATES.map((state) => [state, byState[state].totalElements])) as Record<State, number>);
			setTotal(STATES.reduce((sum, state) => sum + byState[state].totalElements, 0));
			setUsers(byState[status].items);
			setTicked(new Set());
			setFocusedId(byState[status].items[0]?.id ?? null);
		} catch (err) {
			setError(err);
		} finally {
			setBusy(false);
		}
	}, [status]);

	useEffect(() => {
		void load();
	}, [load]);

	async function runAction(id: string, action: Action, reason?: string): Promise<void> {
		if (action === "approve") return approveUser(id).then(() => undefined);
		if (action === "reject") return rejectUser(id, reason).then(() => undefined);
		if (action === "delete") return deleteUser(id);
		return setUserStatus(id, action === "suspend" ? "SUSPENDED" : "ACTIVE").then(() => undefined);
	}

	async function apply(ids: string[], action: Action, reason?: string) {
		if (!ids.length) return;
		setBusy(true);
		setError(null);

		const failures: string[] = [];
		for (const id of ids) {
			try {
				await runAction(id, action, reason);
			} catch (err) {
				failures.push(err instanceof ApiError ? err.message : `${id.slice(0, 8)}`);
			}
		}

		await load();
		if (failures.length) setError(new ApiError(0, "INTERNAL_ERROR", failures.join(" · ")));
	}

	return {
		status, setStatus,
		users, counts, total,
		focusedId, setFocusedId,
		ticked, setTicked,
		error, busy,
		apply,
	};
}
