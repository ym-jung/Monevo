"use client";

import {
	FILTER_LABEL_WIDTH, INSPECTOR_DEFAULT, MAIN_MIN_WIDTH, RESIZE_HANDLE, SEARCH_SHRINK_WIDTH,
	SIDEBAR_WIDTH, useElementWidth, usePersistedFlag, usePersistedNumber, useViewportWidth,
} from "./layout";

export function useDeskShell(inspectorWidthKey: string) {
	const [sidebarPref, setSidebarPref] = usePersistedFlag("sidebar-collapsed");
	const [inspectorWidth, setInspectorWidth] = usePersistedNumber(inspectorWidthKey, 0);
	const viewport = useViewportWidth();
	const [mainRef, mainWidth] = useElementWidth<HTMLElement>();

	const inspectorPx = inspectorWidth || INSPECTOR_DEFAULT;

	const roomIfExpanded = viewport - SIDEBAR_WIDTH - RESIZE_HANDLE - inspectorPx;
	const sidebarCollapsed = sidebarPref || (viewport > 0 && roomIfExpanded < MAIN_MIN_WIDTH);

	const filterIconOnly = mainWidth > 0 && mainWidth < FILTER_LABEL_WIDTH;
	const searchNarrow = mainWidth > 0 && mainWidth < SEARCH_SHRINK_WIDTH;

	return {
		sidebarPref,
		setSidebarPref,
		sidebarCollapsed,
		inspectorPx,
		setInspectorWidth,
		mainRef,
		mainWidth,
		filterIconOnly,
		searchNarrow,
	};
}
