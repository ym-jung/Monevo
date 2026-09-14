"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const FILTER_LABEL_WIDTH = 780;
export const SEARCH_SHRINK_WIDTH = 700;

export const MAIN_MIN_WIDTH = 620;
export const SIDEBAR_WIDTH = 257;
export const RESIZE_HANDLE = 6;

export const INSPECTOR_MIN = 230;
export const INSPECTOR_MAX = 615;
export const INSPECTOR_DEFAULT = 307;

export const AUTO_RAIL_WIDTH = 1100;

const PREFIX = "okg-ui:";

function read<T>(key: string, fallback: T, parse: (raw: string) => T | null): T {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		if (raw === null) return fallback;
		return parse(raw) ?? fallback;
	} catch {

		return fallback;
	}
}

function write(key: string, value: string): void {
	try {
		localStorage.setItem(PREFIX + key, value);
	} catch {

	}
}

export function usePersisted<T>(key: string, fallback: T, parse: (raw: string) => T | null, format: (value: T) => string) {
	const [value, setValue] = useState<T>(fallback);
	const loaded = useRef(false);

	useEffect(() => {
		setValue(read(key, fallback, parse));
		loaded.current = true;

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	const update = useCallback((next: T) => {
		setValue(next);
		write(key, format(next));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	return [value, update, loaded] as const;
}

export function usePersistedFlag(key: string, fallback = false) {
	return usePersisted<boolean>(key, fallback, (raw) => (raw === "1" ? true : raw === "0" ? false : null), (v) => (v ? "1" : "0"));
}

export function usePersistedNumber(key: string, fallback: number) {
	return usePersisted<number>(key, fallback, (raw) => {
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	}, String);
}

export function useElementWidth<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);
	const [width, setWidth] = useState(0);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		setWidth(el.getBoundingClientRect().width);
		const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return [ref, width] as const;
}

export function useViewportWidth() {
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const measure = () => setWidth(window.innerWidth);
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);
	return width;
}

export function useDragWidth(width: number, onWidth: (px: number) => void, min: number, max: number) {
	const [dragging, setDragging] = useState(false);
	const start = useRef({ x: 0, width: 0 });

	useEffect(() => {
		if (!dragging) return;
		const move = (e: PointerEvent) => {
			const next = start.current.width - (e.clientX - start.current.x);
			onWidth(Math.min(max, Math.max(min, next)));
		};
		const stop = () => setDragging(false);
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", stop);

		const previous = document.body.style.userSelect;
		document.body.style.userSelect = "none";
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", stop);
			document.body.style.userSelect = previous;
		};
	}, [dragging, onWidth, min, max]);

	const onPointerDown = useCallback((e: React.PointerEvent) => {
		start.current = { x: e.clientX, width };
		setDragging(true);
	}, [width]);

	return { dragging, onPointerDown };
}
