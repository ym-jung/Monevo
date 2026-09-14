"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon, SidebarItem, SidebarSection } from "@/ds";
import { endBrowserSession } from "@/lib/amplify/browserSession.client";
import type { AccountDetail, AccountType, CategoryNode, LedgerDetail, UserSummary } from "@/lib/api/types";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { RAIL_BUTTON, RAIL_DIVIDER, RailButton, RailFlyout, RailNav } from "@/features/common/Rail";
import { useT } from "@/lib/i18n/provider";

import { type InkLookup, inkVar } from "@/features/category/ink";

export type LedgerTab = "ledger" | "accounts" | "categories" | "insights" | "members";

const VIEWS: { id: LedgerTab; icon: string; key: MessageKey }[] = [
	{ id: "ledger", icon: "book-open", key: "sidebar.ledgerView" },
	{ id: "accounts", icon: "wallet", key: "accounts.title" },
	{ id: "categories", icon: "tag", key: "sidebar.categories" },
	{ id: "insights", icon: "chart-no-axes-column", key: "sidebar.insights" },
	{ id: "members", icon: "users", key: "sidebar.members" },
];

const RAIL_SECTIONS: { id: RailSection; icon: string; key: MessageKey }[] = [
	{ id: "ledgers", icon: "book-open", key: "sidebar.ledgers" },
	{ id: "views", icon: "layout-grid", key: "sidebar.views" },
	{ id: "accounts", icon: "wallet", key: "sidebar.accounts" },
	{ id: "categories", icon: "tag", key: "sidebar.categories" },
];

type RailSection = "ledgers" | "views" | "accounts" | "categories";

const ACCOUNT_GROUPS: { key: MessageKey; types: AccountType[] }[] = [
	{ key: "sidebar.accounts", types: ["BANK"] },
	{ key: "sidebar.cash", types: ["CASH"] },
	{ key: "sidebar.eMoney", types: ["E_MONEY"] },
	{ key: "sidebar.cards", types: ["CREDIT_CARD"] },
];

const BOTTOM_LINK: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--space-5)",
	width: "100%",
	height: "var(--sidebar-row-height)",
	padding: "0 var(--space-10)",
	border: "none",
	background: "transparent",
	font: "var(--type-label-md)",
	letterSpacing: "var(--tracking-normal)",
	textTransform: "uppercase",
	color: "var(--ink-on-dark-3)",
	cursor: "pointer",
	textDecoration: "none",
};

function NewRow({ label, icon = "plus", onClick }: { label: string; icon?: string; onClick: () => void }) {
	return (
		<button type="button" onClick={onClick} className="ds-focusable" style={BOTTOM_LINK}>
			<Icon name={icon} size={13} />
			<span>{label}</span>
		</button>
	);
}

export interface SidebarProps {
	ledgers: LedgerDetail[];
	ledgerId: string;
	accounts: AccountDetail[];
	categories: CategoryNode[];
	inkOf: InkLookup;
	tab: LedgerTab;
	accountIds: string[];
	categoryIds: string[];
	user: UserSummary;
	collapsed: boolean;

	variant?: "pane" | "drawer";
	onToggleCollapsed: () => void;
	onTab: (tab: LedgerTab) => void;
	onLedger: (id: string) => void;
	onAccount: (id: string) => void;
	onCategory: (id: string) => void;
	onNewLedger: () => void;
	onJoinLedger: () => void;
	onNewAccount: () => void;
	onNewCategory: () => void;
	onEditLedger: (id: string) => void;
	onEditAccount: (id: string) => void;
	onEditCategory: (id: string) => void;
}

export function Sidebar(props: SidebarProps) {
	const t = useT();
	const router = useRouter();
	const { ledgers, ledgerId, accounts, categories, inkOf, tab, accountIds, categoryIds, user, collapsed, variant = "pane" } = props;
	const drawer = variant === "drawer";
	const hasLedger = ledgers.length > 0;

	const [openSection, setOpenSection] = useState<RailSection | null>(null);

	const live = accounts.filter((a) => !a.archived);

	async function leave() {
		await endBrowserSession().catch(() => {});
		router.replace("/sign-in");
		router.refresh();
	}

	if (collapsed && !drawer) {
		return (
			<Rail
				{...props}
				live={live}
				hasLedger={hasLedger}
				openSection={openSection}
				onOpenSection={setOpenSection}
				onLeave={leave}
			/>
		);
	}

	return (
		<nav
			style={
				drawer
					? { width: "100%", flex: 1, minHeight: 0, background: "var(--surface-sidebar)", display: "flex", flexDirection: "column" }
					: { width: "var(--sidebar-width)", flex: "0 0 auto", background: "var(--surface-sidebar)", display: "flex", flexDirection: "column" }
			}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", padding: drawer ? "0 var(--space-10) var(--space-6)" : "var(--space-10) var(--space-8) var(--space-6) var(--space-10)", borderBottom: "var(--hairline) solid var(--ink-3)" }}>
				<span style={{ flex: 1, minWidth: 0, font: "var(--type-title-3)", letterSpacing: "var(--tracking-normal)", color: "var(--paper-1)" }}>Monevo</span>
				{drawer ? null : <RailButton icon="panel-left-close" label={t("sidebar.collapse")} onClick={props.onToggleCollapsed} />}
			</div>

			<div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "var(--space-8) 0" }}>
				<SidebarSection label={t("sidebar.ledgers")}>
					{ledgers.map((ledger) => (
						<SidebarItem
							key={ledger.id}
							label={ledger.name}
							trailing={ledger.currency}
							selected={ledger.id === ledgerId}
							onClick={() => props.onLedger(ledger.id)}

							onEdit={ledger.id === ledgerId && ledger.myRole === "OWNER" ? () => props.onEditLedger(ledger.id) : undefined}
							editLabel={t("common.edit")}
						/>
					))}
					<NewRow label={t("sidebar.newLedger")} onClick={props.onNewLedger} />
					<NewRow label={t("sidebar.joinWithCode")} icon="ticket" onClick={props.onJoinLedger} />
				</SidebarSection>

				{hasLedger ? (
					<SidebarSection label={t("sidebar.views")}>
						{VIEWS.map((view) => (
							<SidebarItem
								key={view.id}
								icon={view.icon}
								label={t(view.key)}
								selected={tab === view.id}
								onClick={() => props.onTab(view.id)}
							/>
						))}
					</SidebarSection>
				) : null}

				{ACCOUNT_GROUPS.map(({ key, types }) => {
					const list = live.filter((a) => types.includes(a.type));
					if (!list.length) return null;
					return (
						<SidebarSection key={key} label={t(key)}>
							{list.map((account) => (
								<SidebarItem
									key={account.id}
									label={account.name}
									trailing={account.currency}
									selected={accountIds.includes(account.id)}
									onClick={() => props.onAccount(account.id)}
									onEdit={account.ownerUserId === user.id ? () => props.onEditAccount(account.id) : undefined}
									editLabel={t("common.edit")}
								/>
							))}
						</SidebarSection>
					);
				})}
				{hasLedger ? (
					<div style={{ marginBottom: "var(--space-8)" }}>
						<NewRow label={t("sidebar.newAccount")} icon="wallet" onClick={props.onNewAccount} />
					</div>
				) : null}

				{hasLedger ? (
					<SidebarSection label={t("sidebar.categories")}>
						{categories.map((category) => (
							<SidebarItem
								key={category.id}
								label={category.name}
								dotColor={inkVar(inkOf(category.id))}
								selected={categoryIds.includes(category.id)}
								onClick={() => props.onCategory(category.id)}

								onEdit={() => props.onEditCategory(category.id)}
								editLabel={t("common.edit")}
							/>
						))}
						<NewRow label={t("sidebar.newCategory")} icon="tag" onClick={props.onNewCategory} />
					</SidebarSection>
				) : null}
			</div>

			<div style={{ borderTop: "var(--hairline) solid var(--ink-3)", padding: "var(--space-5) 0" }}>
				{user.role === "ADMIN" ? (
					<Link href="/admin/users" prefetch={false} style={BOTTOM_LINK} className="ds-focusable">
						<Icon name="users" size={13} />
						<span>{t("sidebar.admin")}</span>
					</Link>
				) : null}
				<button type="button" onClick={leave} style={BOTTOM_LINK} className="ds-focusable">
					<Icon name="log-out" size={13} />
					<span>{t("auth.signOut")}</span>
				</button>
			</div>
		</nav>
	);
}



interface RailProps extends SidebarProps {
	live: AccountDetail[];
	hasLedger: boolean;
	openSection: RailSection | null;
	onOpenSection: (section: RailSection | null) => void;
	onLeave: () => void;
}

function Rail(props: RailProps) {
	const t = useT();
	const { hasLedger, openSection } = props;

	return (
		<RailNav>
			<RailButton icon="panel-left-open" label={t("sidebar.expand")} onClick={props.onToggleCollapsed} />
			<span style={RAIL_DIVIDER} />

			{RAIL_SECTIONS.map((section) => {

				if (!hasLedger && section.id !== "ledgers") return null;
				return (
					<RailButton
						key={section.id}
						icon={section.icon}
						label={t(section.key)}
						selected={openSection === section.id}
						onClick={() => props.onOpenSection(openSection === section.id ? null : section.id)}
					/>
				);
			})}

			<span style={{ flex: 1 }} />
			<span style={RAIL_DIVIDER} />
			{props.user.role === "ADMIN" ? (
				<Link href="/admin/users" prefetch={false} aria-label={t("sidebar.admin")} title={t("sidebar.admin")} className="ds-focusable" style={RAIL_BUTTON}>
					<Icon name="users" size={15} />
				</Link>
			) : null}
			<RailButton icon="log-out" label={t("auth.signOut")} onClick={props.onLeave} />

			{openSection ? <RailSectionMenu {...props} section={openSection} /> : null}
		</RailNav>
	);
}

function RailSectionMenu(props: RailProps & { section: RailSection }) {
	const t = useT();
	const { section, live, ledgers, ledgerId, categories, inkOf, tab, accountIds, categoryIds } = props;
	const close = () => props.onOpenSection(null);
	const pick = (run: () => void) => () => { run(); close(); };

	return (
		<RailFlyout onClose={close}>
				{section === "ledgers" ? (
					<SidebarSection label={t("sidebar.ledgers")}>
						{ledgers.map((ledger) => (
							<SidebarItem
								key={ledger.id}
								label={ledger.name}
								trailing={ledger.currency}
								selected={ledger.id === ledgerId}
								onClick={pick(() => props.onLedger(ledger.id))}
							/>
						))}
						<NewRow label={t("sidebar.newLedger")} onClick={pick(props.onNewLedger)} />
						<NewRow label={t("sidebar.joinWithCode")} icon="ticket" onClick={pick(props.onJoinLedger)} />
					</SidebarSection>
				) : null}

				{section === "views" ? (
					<SidebarSection label={t("sidebar.views")}>
						{VIEWS.map((view) => (
							<SidebarItem
								key={view.id}
								icon={view.icon}
								label={t(view.key)}
								selected={tab === view.id}
								onClick={pick(() => props.onTab(view.id))}
							/>
						))}
					</SidebarSection>
				) : null}

				{section === "accounts" ? (
					<>
						{ACCOUNT_GROUPS.map(({ key, types }) => {
							const list = live.filter((a) => types.includes(a.type));
							if (!list.length) return null;
							return (
								<SidebarSection key={key} label={t(key)}>
									{list.map((account) => (
										<SidebarItem
											key={account.id}
											label={account.name}
											trailing={account.currency}
											selected={accountIds.includes(account.id)}
											onClick={() => props.onAccount(account.id)}
											onEdit={account.ownerUserId === props.user.id ? pick(() => props.onEditAccount(account.id)) : undefined}
											editLabel={t("common.edit")}
										/>
									))}
								</SidebarSection>
							);
						})}
						<NewRow label={t("sidebar.newAccount")} icon="wallet" onClick={pick(props.onNewAccount)} />
					</>
				) : null}

				{section === "categories" ? (
					<SidebarSection label={t("sidebar.categories")}>
						{categories.map((category) => (
							<SidebarItem
								key={category.id}
								label={category.name}
								dotColor={inkVar(inkOf(category.id))}
								selected={categoryIds.includes(category.id)}
								onClick={() => props.onCategory(category.id)}
								onEdit={pick(() => props.onEditCategory(category.id))}
								editLabel={t("common.edit")}
							/>
						))}
						<NewRow label={t("sidebar.newCategory")} icon="tag" onClick={pick(props.onNewCategory)} />
					</SidebarSection>
				) : null}
		</RailFlyout>
	);
}
