"use client";

import { useCallback, useEffect, useState } from "react";

import type { LedgerDetail, LedgerInviteResponse, LedgerMemberDetail } from "@/lib/api/types";

import { listInvites, listMembers } from "./api";

export function useLedgerMembers(ledger: LedgerDetail) {
	const [members, setMembers] = useState<LedgerMemberDetail[]>([]);
	const [invites, setInvites] = useState<LedgerInviteResponse[]>([]);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const isOwner = ledger.myRole === "OWNER";
	const ledgerId = ledger.id;

	const refresh = useCallback(async () => {
		setError(null);
		try {
			const [nextMembers, nextInvites] = await Promise.all([
				listMembers(ledgerId),
				isOwner ? listInvites(ledgerId) : Promise.resolve([]),
			]);
			setMembers(nextMembers);
			setInvites(nextInvites);
		} catch (err) {
			setError(err);
		}
	}, [ledgerId, isOwner]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const run = useCallback(async (action: () => Promise<void>) => {
		setBusy(true);
		try {
			await action();
		} catch (err) {
			setError(err);
		} finally {
			setBusy(false);
		}
	}, []);

	return { members, invites, error, setError, busy, isOwner, refresh, run };
}
