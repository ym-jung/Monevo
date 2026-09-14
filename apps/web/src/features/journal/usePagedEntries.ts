"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { JournalEntryListQuery, JournalEntrySummary, PageResponse } from "@/lib/api/types";

import { listEntries } from "./api";
import { type LedgerRow, toRow } from "./row";

function queryKeyOf(query: JournalEntryListQuery): string {
	const entries = Object.entries(query)
		.filter(([, value]) => value !== undefined && value !== null && value !== "")
		.sort(([a], [b]) => a.localeCompare(b));
	return JSON.stringify(entries);
}

function scrollParent(node: HTMLElement | null): HTMLElement | null {
	let el = node?.parentElement ?? null;
	while (el) {
		const { overflowY } = getComputedStyle(el);
		if (overflowY === "auto" || overflowY === "scroll") return el;
		el = el.parentElement;
	}
	return null;
}

export interface PagedEntries {
	rows: LedgerRow[];
	loaded: number;
	total: number;

	done: boolean;
	loading: boolean;
	error: ApiError | null;
	sentinel: (node: HTMLElement | null) => void;
	reload: () => void;
}

export interface InitialPage {
	query: JournalEntryListQuery;
	page: PageResponse<JournalEntrySummary>;
}

export function usePagedEntries(query: JournalEntryListQuery, baseCurrency: string, initial?: InitialPage): PagedEntries {
	const queryKey = queryKeyOf(query);
	const seeded = initial ? queryKeyOf(initial.query) === queryKey : false;

	const [rows, setRows] = useState<LedgerRow[]>(() => (seeded ? initial!.page.items.map((e) => toRow(e, baseCurrency)) : []));
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(() => (seeded ? initial!.page.totalElements : 0));
	const [hasNext, setHasNext] = useState(() => (seeded ? initial!.page.hasNext : true));
	const [loading, setLoading] = useState(!seeded);
	const [error, setError] = useState<ApiError | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const loadedKey = useRef(seeded ? queryKey : null);

	const usingServerPage = useRef(seeded);

	function toApiError(err: unknown): ApiError {
		return err instanceof ApiError ? err : new ApiError(0, "INTERNAL_ERROR", "Could not load entries.");
	}

	useEffect(() => {
		if (usingServerPage.current) {

			usingServerPage.current = false;
			return;
		}

		let cancelled = false;
		setRows([]);
		setPage(0);
		setTotal(0);
		setHasNext(true);
		setLoading(true);
		setError(null);

		listEntries({ ...(Object.fromEntries(JSON.parse(queryKey)) as JournalEntryListQuery), page: 0 })
			.then((response) => {
				if (cancelled) return;
				loadedKey.current = queryKey;
				setRows(response.items.map((entry) => toRow(entry, baseCurrency)));
				setTotal(response.totalElements);
				setHasNext(response.hasNext);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(toApiError(err));
				setHasNext(false);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [queryKey, reloadKey, baseCurrency]);

	useEffect(() => {
		if (page === 0) return;

		if (loadedKey.current !== queryKey) return;

		let cancelled = false;
		setLoading(true);

		listEntries({ ...(Object.fromEntries(JSON.parse(queryKey)) as JournalEntryListQuery), page })
			.then((response) => {
				if (cancelled) return;
				setRows((prev) => [...prev, ...response.items.map((entry) => toRow(entry, baseCurrency))]);
				setTotal(response.totalElements);
				setHasNext(response.hasNext);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(toApiError(err));
				setHasNext(false);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [queryKey, page, reloadKey, baseCurrency]);

	const observer = useRef<IntersectionObserver | null>(null);

	const sentinel = useCallback(
		(node: HTMLElement | null) => {
			observer.current?.disconnect();

			if (!node || !hasNext || loading) return;
			observer.current = new IntersectionObserver(
				(entries) => {
					if (entries.some((e) => e.isIntersecting)) setPage((p) => p + 1);
				},
				{

					root: scrollParent(node),

					// eslint-disable-next-line no-restricted-syntax
					rootMargin: "160px",
				},
			);
			observer.current.observe(node);
		},
		[hasNext, loading],
	);

	useEffect(() => () => observer.current?.disconnect(), []);

	return {
		rows,
		loaded: rows.length,
		total,
		done: !hasNext && !loading,
		loading,
		error,
		sentinel,
		reload: () => {
			usingServerPage.current = false;
			setReloadKey((k) => k + 1);
		},
	};
}
