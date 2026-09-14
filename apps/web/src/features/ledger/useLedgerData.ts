"use client";

import { useEffect, useRef, useState } from "react";

import type { AccountDetail, CategoryNode, MonthlySummary } from "@/lib/api/types";

import { listAccounts } from "@/features/account/api";
import { flattenCategories, listCategories } from "@/features/category/api";
import { getMonthlySummary } from "@/features/report/api";

export interface LedgerDataInput {
	ledgerId: string;
	initialLedgerId: string;
	month: string;
	initialMonth: string;
	accountIds: string[];
	categoryIds: string[];
	initial: {
		accounts: AccountDetail[];
		categories: CategoryNode[];
		summary: MonthlySummary | null;
	};
	onFiltersPruned: (accountIds: string[], categoryIds: string[]) => void;
}

function summaryKey(ledgerId: string, month: string, accountIds: string[], categoryIds: string[]): string {
	return [ledgerId, month, [...accountIds].sort().join(","), [...categoryIds].sort().join(",")].join("|");
}

export function useLedgerData(input: LedgerDataInput) {
	const {
		ledgerId, initialLedgerId, month, initialMonth,
		accountIds, categoryIds, initial, onFiltersPruned,
	} = input;

	const [accounts, setAccounts] = useState<AccountDetail[]>(initial.accounts);
	const [categories, setCategories] = useState<CategoryNode[]>(initial.categories);
	const [summary, setSummary] = useState<MonthlySummary | null>(initial.summary);

	const loadedLedgerId = useRef(initialLedgerId);
	const loadedSummaryKey = useRef(summaryKey(initialLedgerId, initialMonth, [], []));

	useEffect(() => {
		if (loadedLedgerId.current === ledgerId) return;
		loadedLedgerId.current = ledgerId;
		let cancelled = false;
		Promise.all([listAccounts(ledgerId), listCategories(ledgerId)])
			.then(([nextAccounts, nextCategories]) => {
				if (cancelled) return;
				setAccounts(nextAccounts);
				setCategories(nextCategories);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [ledgerId, initialLedgerId]);

	useEffect(() => {
		const key = summaryKey(ledgerId, month, accountIds, categoryIds);
		if (loadedSummaryKey.current === key) return;
		loadedSummaryKey.current = key;

		let cancelled = false;
		getMonthlySummary(
			ledgerId,
			month,
			accountIds.length ? accountIds : undefined,
			categoryIds.length ? categoryIds : undefined,
		)
			.then((next) => !cancelled && setSummary(next))
			.catch(() => !cancelled && setSummary(null));
		return () => {
			cancelled = true;
		};
	}, [ledgerId, month, accountIds, categoryIds]);

	async function refresh() {
		const [nextAccounts, nextCategories] = await Promise.all([listAccounts(ledgerId), listCategories(ledgerId)]);
		const nextAccountIds = accountIds.filter((id) => nextAccounts.some((account) => account.id === id));
		const nextCategoryIds = categoryIds.filter(
			(id) => flattenCategories(nextCategories).some((category) => category.id === id));

		setAccounts(nextAccounts);
		setCategories(nextCategories);
		onFiltersPruned(nextAccountIds, nextCategoryIds);

		loadedSummaryKey.current = summaryKey(ledgerId, month, nextAccountIds, nextCategoryIds);

		getMonthlySummary(
			ledgerId,
			month,
			nextAccountIds.length ? nextAccountIds : undefined,
			nextCategoryIds.length ? nextCategoryIds : undefined,
		).then(setSummary).catch(() => setSummary(null));
	}

	return { accounts, categories, summary, refresh };
}
