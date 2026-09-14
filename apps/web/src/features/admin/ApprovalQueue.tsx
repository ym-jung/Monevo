"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar, Badge, Button, Checkbox, EmptyState, Icon, Input, ListRow, Select, SidebarItem, SidebarSection, Toolbar } from "@/ds";
import { ApiError } from "@/lib/api/errors";
import type { AdminUserSummary, UserSummary } from "@/lib/api/types";

import { useT } from "@/lib/i18n/provider";
import { usePhone } from "@/lib/viewport/provider";

import { PRIMARY_FOR, STATES, STATE_ICON, TONE, actionKey, statusKey, type State } from "./queueVocabulary";
import { CELL, COLUMNS, ELLIPSIS } from "./queueTable";
import { useApprovalQueue } from "./useApprovalQueue";
import { AdminRail, type AdminSection } from "./AdminRail";
import { DetailRow } from "./DetailRow";
import { Fab, FAB_STACK, FabLink } from "@/features/common/Fab";
import { useDeskShell } from "@/features/common/deskShell";
import { RailButton } from "@/features/common/Rail";
import { ResizeHandle } from "@/features/common/ResizeHandle";
import { SEARCH_BOX, SEARCH_BOX_NARROW, SHELL, TABLE_MIN_WIDTH } from "@/features/common/shell";
import { PhoneNavBar, PhoneShell } from "@/features/common/PhoneChrome";
import { Sheet } from "@/features/common/Sheet";

const BACK_LINK: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: "var(--space-4)",
	height: "var(--control-height)",
	border: "var(--hairline) solid var(--ink-3)",
	borderRadius: "var(--radius-control)",
	font: "var(--type-label-md)",
	letterSpacing: "var(--tracking-label)",
	textTransform: "uppercase",
	color: "var(--ink-on-dark-2)",
	textDecoration: "none",
};

const EYEBROW: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	textTransform: "uppercase",
	color: "var(--text-tertiary)",
};

export function ApprovalQueue({ viewer, initial }: { viewer: UserSummary; initial: AdminUserSummary[] }) {
	const t = useT();
	const viewerId = viewer.id;

	const {
		setSidebarPref, sidebarCollapsed: collapsed,
		inspectorPx, setInspectorWidth, mainRef, searchNarrow,
	} = useDeskShell("admin-inspector-width");
	const {
		status, setStatus, users, counts, total,
		focusedId, setFocusedId, ticked, setTicked,
		error, busy, apply,
	} = useApprovalQueue(initial);
	const [openSection, setOpenSection] = useState<AdminSection | null>(null);
	const [query, setQuery] = useState("");
	const [rejectReason, setRejectReason] = useState("");
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const phone = usePhone();
	const [detailOpen, setDetailOpen] = useState(false);

	const focused = users.find((u) => u.id === focusedId) ?? null;
	const visible = users.filter((u) => `${u.displayName} ${u.email}`.toLowerCase().includes(query.toLowerCase()));
	const primary = PRIMARY_FOR[status];
	const tickedIds = visible.filter((u) => ticked.has(u.id)).map((u) => u.id);

	const detail = !focused ? (
		<EmptyState icon="user-round" title={t("admin.noSelection")} />
	) : (
		<div style={{ padding: "var(--space-10) var(--space-8)" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-8)" }}>
				<Avatar name={focused.displayName} size={38} />
				<div style={{ minWidth: 0 }}>
					<div style={{ font: "var(--type-title-3)", letterSpacing: "var(--tracking-tight)", color: "var(--text-primary)" }}>{focused.displayName}</div>
					<div style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", wordBreak: "break-all" }}>{focused.email}</div>
				</div>
			</div>

			<DetailRow label={t("admin.requested")}>{focused.createdAt.slice(0, 10)}</DetailRow>
			<DetailRow label={t("admin.status")}>{t(statusKey(focused.status))}</DetailRow>
			<DetailRow label={t("admin.role")}>{focused.role}</DetailRow>
			<DetailRow label={t("admin.userId")}>{focused.id.slice(0, 8)}</DetailRow>

			{focused.rejectReason ? (
				<DetailRow label={t("admin.rejectedBecause")}>{focused.rejectReason}</DetailRow>
			) : null}

			{focused.email.endsWith("@unknown.local") ? (
				<div style={{ marginTop: "var(--space-7)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
					{t("admin.placeholderEmail")}
				</div>
			) : null}

			{focused.id === viewerId ? (
				<div style={{ marginTop: "var(--space-10)", font: "var(--type-prose)", color: "var(--text-secondary)" }}>{t("admin.ownAccount")}</div>
			) : (
				<div style={{ marginTop: "var(--space-10)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
					<Button variant="primary" icon="check" fullWidth disabled={busy} onClick={() => apply([focused.id], primary)}>
						{t(actionKey(primary))}
					</Button>
					{focused.status === "PENDING" ? (
						<>
							<Input
								value={rejectReason}
								placeholder={t("admin.rejectReason")}
								maxLength={200}
								onChange={(e) => setRejectReason(e.target.value)}
							/>
							<Button icon="x" fullWidth disabled={busy} onClick={() => {
								void apply([focused.id], "reject", rejectReason);
								setRejectReason("");
							}}>{t("admin.reject")}</Button>
							<span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", textWrap: "pretty" }}>{t("admin.rejectReasonHint")}</span>
						</>
					) : null}
					<span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", textWrap: "pretty" }}>{t("admin.immediate")}</span>

					{confirmDelete === focused.id ? (
						<Button variant="danger" fullWidth disabled={busy} onClick={() => {
							void apply([focused.id], "delete");
							setConfirmDelete(null);
						}}>{t("admin.confirmDelete")}</Button>
					) : (
						<Button icon="trash-2" fullWidth disabled={busy} onClick={() => setConfirmDelete(focused.id)}>{t("admin.delete")}</Button>
					)}
					<span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", textWrap: "pretty" }}>{t("admin.deleteNote")}</span>
				</div>
			)}
		</div>
	);

	if (phone) {
		return (
			<PhoneShell>
				<PhoneNavBar
					leading={
						<Link href="/" aria-label={t("admin.backToApp")} className="ds-focusable" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "var(--control-height-lg)", height: "var(--control-height-lg)", border: "var(--hairline) solid var(--border-strong)", color: "var(--text-primary)" }}>
							<Icon name="arrow-left" size={16} />
						</Link>
					}
					title={t("admin.title")}
					meta={t("admin.waiting", { count: counts.PENDING ?? 0 })}
					trailing={
						<Link href="/profile" aria-label={t("toolbar.yourProfile")} style={{ display: "inline-flex" }}>
							<Avatar name={viewer.displayName} size={28} />
						</Link>
					}
				/>

				<div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-6)", borderBottom: "var(--hairline) solid var(--desk-3)", background: "var(--surface-desk)" }}>
					<Select
						value={status}
						size="lg"
						onChange={(next: string) => setStatus(next as State)}
						options={STATES.map((state) => ({
							value: state,
							label: counts[state] === undefined ? t(statusKey(state)) : `${t(statusKey(state))} · ${counts[state]}`,
						}))}
					/>
					<Input
						icon="search"
						size="lg"
						placeholder={t("admin.searchUsers")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				{error ? (
					<div role="alert" style={{ flex: "0 0 auto", padding: "var(--space-6)", font: "var(--type-prose)", color: "var(--status-danger)" }}>
						{error instanceof ApiError ? error.message : t("admin.loadFailed")}
					</div>
				) : null}

				<div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--surface-paper)" }}>
					{visible.length === 0 ? (
						<EmptyState icon="inbox" title={t("admin.empty")} />
					) : (
						visible.map((user) => (
							<button
								key={user.id}
								type="button"
								className="ds-focusable"
								onClick={() => {
									setFocusedId(user.id);
									setDetailOpen(true);
								}}
								style={{
									width: "100%",
									minHeight: "2.75rem",
									display: "flex",
									alignItems: "center",
									gap: "var(--space-5)",
									padding: "var(--space-5) var(--space-6)",
									border: "none",
									background: "transparent",
									textAlign: "left",
									cursor: "pointer",
									borderBottom: "var(--rule-row)",
								}}
							>
								<Avatar name={user.displayName} size={28} />
								<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
									<span style={{ ...ELLIPSIS, font: "var(--type-body)", color: "var(--text-primary)" }}>{user.displayName}</span>
									<span style={{ ...ELLIPSIS, font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{user.email}</span>
									<span style={{ ...EYEBROW, letterSpacing: "var(--tracking-label)" }}>{user.createdAt.slice(0, 10)}</span>
								</span>
								<Badge tone={TONE[user.status]}>{t(statusKey(user.status))}</Badge>
							</button>
						))
					)}
					<footer style={{ padding: "var(--space-6)", textAlign: "center", ...EYEBROW }}>
						{t("admin.ofAccounts", { shown: visible.length, total })}
					</footer>
				</div>

				{detailOpen && focused ? (
					<Sheet title={t("nav.details")} onDismiss={() => setDetailOpen(false)}>
						{detail}
					</Sheet>
				) : null}
			</PhoneShell>
		);
	}

	return (
		<div style={SHELL}>
			{collapsed ? (
				<AdminRail
					counts={counts}
					status={status}
					openSection={openSection}
					onOpenSection={setOpenSection}
					onStatus={setStatus}
					onExpand={() => setSidebarPref(false)}
				/>
			) : (
			<nav style={{ width: "var(--sidebar-width)", flex: "0 0 auto", background: "var(--surface-sidebar)", display: "flex", flexDirection: "column" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-10) var(--space-8) var(--space-6) var(--space-10)" }}>
					<span style={{ font: "var(--type-title-3)", letterSpacing: "var(--tracking-normal)", color: "var(--paper-1)" }}>Monevo</span>
					<span style={{ flex: 1, minWidth: 0, font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--ink-on-dark-3)" }}>
						{t("admin.label")}
					</span>
					<RailButton icon="panel-left-close" label={t("sidebar.collapse")} onClick={() => setSidebarPref(true)} />
				</div>

				<div style={{ padding: "0 var(--space-8) var(--space-8)" }}>
					<Link href="/" className="ds-focusable" style={BACK_LINK}>
						<Icon name="arrow-left" size={13} />
						<span>{t("admin.backToApp")}</span>
					</Link>
				</div>

				<div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
					<SidebarSection label={t("admin.signUps")}>
						{STATES.map((state) => (
							<SidebarItem
								key={state}
								icon={STATE_ICON[state]}
								label={t(statusKey(state))}

								trailing={counts[state] === undefined ? "—" : String(counts[state])}
								selected={status === state}
								onClick={() => setStatus(state)}
							/>
						))}
					</SidebarSection>

					<SidebarSection label={t("admin.operations")}>
						<SidebarItem icon="refresh-cw" label={t("admin.fxRateRuns")} />
						<SidebarItem icon="book-open" label={t("admin.ledgers")} />
						<SidebarItem icon="file-text" label={t("admin.auditLog")} />
					</SidebarSection>
				</div>
			</nav>
			)}

			<main ref={mainRef} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
				<Toolbar
					title={t("admin.title")}
					subtitle={t("admin.waiting", { count: counts.PENDING ?? 0 })}
					style={{ background: "var(--surface-desk)", borderBottom: "var(--hairline) solid var(--desk-3)" }}
				>
					<Input
						icon="search"
						placeholder={searchNarrow ? t("admin.searchShort") : t("admin.searchUsers")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						style={searchNarrow ? SEARCH_BOX_NARROW : SEARCH_BOX}
					/>
				</Toolbar>

				{error ? (
					<div role="alert" style={{ padding: "var(--space-6) var(--space-10)", font: "var(--type-prose)", color: "var(--status-danger)" }}>
						{error instanceof ApiError ? error.message : t("admin.loadFailed")}
					</div>
				) : null}

				<div style={{ flex: 1, overflow: "auto", minHeight: 0, background: "var(--surface-paper)" }}>
					<div style={{ minWidth: TABLE_MIN_WIDTH }}>
						<div style={{ display: "grid", gridTemplateColumns: COLUMNS, minHeight: "var(--column-header-height)", background: "var(--surface-window)", borderBottom: "var(--hairline) solid var(--border-hairline)", position: "sticky", top: 0, zIndex: 1, font: "var(--type-column-header)", color: "var(--text-tertiary)" }}>
						<div style={{ ...CELL, padding: 0, borderRight: "none" }} />
						<div style={CELL}>{t("admin.name")}</div>
						<div style={CELL}>{t("auth.email")}</div>
						<div style={CELL}>{t("admin.lang")}</div>
						<div style={CELL}>{t("admin.requested")}</div>
						<div style={{ ...CELL, borderRight: "none" }}>{t("admin.status")}</div>
					</div>

					{visible.length === 0 ? (
						<EmptyState icon="inbox" title={t("admin.empty")} />
					) : (
						visible.map((user) => {
							const isFocused = user.id === focusedId;
							const dim = isFocused ? "var(--ink-on-dark-2)" : "var(--text-secondary)";

							return (
								<ListRow key={user.id} selected={isFocused} onClick={() => setFocusedId(user.id)} style={{ display: "grid", gridTemplateColumns: COLUMNS, padding: 0, gap: 0 }}>
									<span style={{ ...CELL, padding: 0, justifyContent: "center", borderRight: "none" }} onClick={(e) => e.stopPropagation()}>
										<Checkbox
											checked={ticked.has(user.id)}
											onChange={(on) =>
												setTicked((prev) => {
													const next = new Set(prev);
													if (on) next.add(user.id);
													else next.delete(user.id);
													return next;
												})
											}
										/>
									</span>
									<span style={{ ...CELL, color: isFocused ? "var(--select-active-fg)" : "var(--text-primary)" }}>
										<Avatar name={user.displayName} size={18} />
										<span style={ELLIPSIS}>{user.displayName}</span>
									</span>
									<span style={{ ...CELL, font: "var(--type-callout)", color: dim }}>
										<span style={ELLIPSIS}>{user.email}</span>
									</span>
									<span style={{ ...CELL, ...EYEBROW, letterSpacing: "var(--tracking-label)", color: dim }}>{user.locale || "—"}</span>
									<span style={{ ...CELL, font: "var(--type-money-sm)", color: dim }}>{user.createdAt.slice(0, 10)}</span>
									<span style={{ ...CELL, borderRight: "none" }}>
										<Badge tone={TONE[user.status]}>{t(statusKey(user.status))}</Badge>
									</span>
								</ListRow>
							);
						})
					)}
					</div>
				</div>

				<footer style={{ padding: "var(--space-5) var(--space-10)", borderTop: "var(--hairline) solid var(--desk-3)", textAlign: "center", ...EYEBROW }}>
					{t("admin.ofAccounts", { shown: visible.length, total })}
				</footer>
			</main>

			<div style={FAB_STACK}>
				<Fab icon="check" label={t(actionKey(primary))} primary disabled={busy || !tickedIds.length} onClick={() => apply(tickedIds, primary)} />
				{status === "PENDING" ? (
					<Fab icon="x" label={t("admin.reject")} disabled={busy || !tickedIds.length} onClick={() => apply(tickedIds, "reject")} />
				) : null}
				<FabLink href="/profile" label={t("toolbar.yourProfile")}>
					<Avatar name={viewer.displayName} size={36} color="var(--ink-1)" />
				</FabLink>
			</div>

			<ResizeHandle width={inspectorPx} onWidth={setInspectorWidth} />
			<aside style={{ width: inspectorPx, flex: "0 0 auto", borderLeft: "var(--hairline) solid var(--border-hairline)", background: "var(--surface-sunken)", overflowY: "auto" }}>
				{detail}
			</aside>

		</div>
	);
}
