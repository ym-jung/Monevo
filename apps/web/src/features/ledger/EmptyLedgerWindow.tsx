"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, Button, EmptyState, Toolbar } from "@/ds";
import type { UserSummary } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { usePhone } from "@/lib/viewport/provider";

import { AUTO_RAIL_WIDTH, usePersistedFlag, useViewportWidth } from "@/features/common/layout";
import { Sidebar } from "./Sidebar";
import { NewLedgerDialog } from "./LedgerDialogs";
import { JoinLedgerDialog } from "./MembersDialog";
import { SHELL } from "@/features/common/shell";
import { MenuButton, PhoneDrawer, PhoneNavBar, PhoneShell } from "@/features/common/PhoneChrome";

type Modal = "new-ledger" | "join" | null;

const emptyInk = () => "transfer" as const;
const ignore = () => {};

export function EmptyLedgerWindow({ viewer }: { viewer: UserSummary }) {
	const t = useT();
	const router = useRouter();
	const [modal, setModal] = useState<Modal>("new-ledger");

	const [sidebarPref, setSidebarPref] = usePersistedFlag("sidebar-collapsed");
	const viewport = useViewportWidth();
	const sidebarCollapsed = sidebarPref || (viewport > 0 && viewport < AUTO_RAIL_WIDTH);
	const phone = usePhone();
	const [drawerOpen, setDrawerOpen] = useState(false);

	function openLedger(id: string) {
		setModal(null);
		router.replace(`/ledgers/${id}`);
	}

	const sidebar = (variant: "pane" | "drawer") => (
		<Sidebar
			variant={variant}
			ledgers={[]}
			ledgerId=""
			accounts={[]}
			categories={[]}
			inkOf={emptyInk}
			tab="ledger"
			accountIds={[]}
			categoryIds={[]}
			user={viewer}
			collapsed={sidebarCollapsed}
			onToggleCollapsed={() => setSidebarPref(!sidebarPref)}
			onTab={ignore}
			onLedger={ignore}
			onAccount={ignore}
			onCategory={ignore}
			onNewLedger={() => setModal("new-ledger")}
			onJoinLedger={() => setModal("join")}
			onNewAccount={ignore}
			onNewCategory={ignore}
			onEditLedger={ignore}
			onEditAccount={ignore}
			onEditCategory={ignore}
		/>
	);

	const paper = (
		<section style={{ position: "relative", width: phone ? "100%" : "var(--slip-width)", maxWidth: "100%", background: "var(--surface-paper)", padding: "0 var(--slip-gutter)", boxShadow: phone ? "none" : "var(--shadow-paper)" }}>
			<span style={{ position: "absolute", left: 0, right: 0, top: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />
			<span style={{ position: "absolute", left: 0, right: 0, bottom: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />
			<EmptyState
				icon="book-open"
				title={t("onboarding.title")}
				action={
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-7)" }}>
						<p style={{ margin: 0, font: "var(--type-prose)", color: "var(--text-secondary)", textAlign: "center", textWrap: "pretty" }}>
							{t("onboarding.body")}
						</p>
						<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "var(--space-4)" }}>
							<Button variant="primary" icon="plus" onClick={() => setModal("new-ledger")}>{t("onboarding.create")}</Button>
							<Button icon="ticket" onClick={() => setModal("join")}>{t("onboarding.join")}</Button>
						</div>
					</div>
				}
			/>
		</section>
	);

	const modals = (
		<>
			{modal === "new-ledger" ? (
				<NewLedgerDialog
					initialCurrency={viewer.displayCurrency ?? undefined}
					initialTimezone={viewer.timezone ?? undefined}
					onClose={() => setModal(null)}
					onSaved={(ledger) => openLedger(ledger.id)}
				/>
			) : null}

			{modal === "join" ? (
				<JoinLedgerDialog onClose={() => setModal(null)} onJoined={openLedger} />
			) : null}
		</>
	);

	if (phone) {
		return (
			<PhoneShell>
				<PhoneNavBar
					leading={<MenuButton onClick={() => setDrawerOpen(true)} />}
					title={t("onboarding.title")}
					meta={t("sidebar.noLedgers")}
					trailing={
						<Link href="/profile" aria-label={t("toolbar.yourProfile")} style={{ display: "inline-flex" }}>
							<Avatar name={viewer.displayName} size={28} />
						</Link>
					}
				/>
				<div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "var(--space-12) var(--space-6)" }}>{paper}</div>
				<PhoneDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
					{sidebar("drawer")}
				</PhoneDrawer>
				{modals}
			</PhoneShell>
		);
	}

	return (
		<div style={SHELL}>
			{sidebar("pane")}

			<main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
				<Toolbar title={t("onboarding.title")} subtitle={t("sidebar.noLedgers")} style={{ background: "var(--surface-desk)", borderBottom: "var(--hairline) solid var(--desk-3)" }}>
					<Link href="/profile" aria-label={t("toolbar.yourProfile")} style={{ display: "inline-flex", marginLeft: "var(--space-3)" }}>
						<Avatar name={viewer.displayName} size={24} />
					</Link>
				</Toolbar>

				<div style={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", padding: "var(--space-14)" }}>
					{paper}
				</div>
			</main>

			{modals}
		</div>
	);
}
