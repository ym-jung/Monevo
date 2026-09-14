"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar, Button, EmptyState, IconButton, Input, SegmentedControl, Toolbar } from "@/ds";
import type {
	AccountDetail, CategoryNode, JournalEntryKind, JournalEntrySummary,
	LedgerDetail, MonthlySummary, PageResponse, UserSummary,
} from "@/lib/api/types";
import { useLocale, useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";
import { usePhone } from "@/lib/viewport/provider";

import { unsettledMinor } from "@/features/account/api";
import { buildInkLookup } from "@/features/category/ink";
import { Breakdown, SlipSummary } from "@/features/report/SlipSummary";
import { ColumnHeader, EntryRow, FxLine, PrintingRule, SlipHeader, TotalLine } from "@/features/journal/Slip";
import { hasConvertedAmount } from "@/features/journal/row";
import { type InitialPage, usePagedEntries } from "@/features/journal/usePagedEntries";
import { Inspector } from "@/features/journal/Inspector";
import { PhoneEntryRow, PhoneSummary, PhoneTotal } from "@/features/journal/PhoneSlip";

import { Fab, FAB_STACK, FabLink, PhoneFab, PHONE_FAB_STACK } from "@/features/common/Fab";
import { MenuButton, PhoneDrawer, PhoneNavBar, PhoneShell, PhoneTabBar, type PhoneTab } from "@/features/common/PhoneChrome";
import { Sheet } from "@/features/common/Sheet";
import { useDeskShell } from "@/features/common/deskShell";
import { ResizeHandle } from "@/features/common/ResizeHandle";
import { SEARCH_BOX, SEARCH_BOX_NARROW, SHELL } from "@/features/common/shell";
import { flattenCategories as flatten } from "@/features/category/api";

import { LedgerModals, type LedgerModal } from "./LedgerModals";
import { useLedgerData } from "./useLedgerData";
import { LedgerPanels } from "./LedgerPanels";
import { type LedgerTab, Sidebar } from "./Sidebar";
import { MonthPicker } from "./MonthPicker";
import { monthLabel, monthRange, shiftMonth } from "./monthNav";

const FILTER_POPOVER: React.CSSProperties = {
	position: "absolute",
	top: "calc(100% + var(--space-3))",
	left: 0,
	zIndex: 30,
	width: "16.75rem",
	maxWidth: "calc(100vw - var(--space-16))",
	padding: "var(--space-7)",
	background: "var(--surface-paper)",
	border: "var(--hairline) solid var(--border-strong)",
	boxShadow: "var(--shadow-popover)",
	display: "flex",
	flexDirection: "column",
	gap: "var(--space-5)",
};

export interface LedgerWindowProps {
	ledgers: LedgerDetail[];
	initialLedgerId: string;
	viewer: UserSummary;

	initial: {
		month: string;
		accounts: AccountDetail[];
		categories: CategoryNode[];
		summary: MonthlySummary | null;
		page: PageResponse<JournalEntrySummary>;
	};
}

export function LedgerWindow({ ledgers, initialLedgerId, viewer, initial }: LedgerWindowProps) {
	const t = useT();
	const locale = useLocale();
	const router = useRouter();
	const [ledgerId, setLedgerId] = useState(initialLedgerId);
	const [tab, setTab] = useState<LedgerTab>("ledger");

	function selectLedger(id: string) {
		setLedgerId(id);
		router.push(`/ledgers/${id}`);
	}
	const [month, setMonth] = useState(initial.month);
	const [accountIds, setAccountIds] = useState<string[]>([]);
	const [categoryIds, setCategoryIds] = useState<string[]>([]);

	const [kinds, setKinds] = useState<JournalEntryKind[]>([]);
	const [filterOpen, setFilterOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const [loadedFilter, setLoadedFilter] = useState("");

	const phone = usePhone();
	const [drawerOpen, setDrawerOpen] = useState(false);

	const {
		sidebarPref, setSidebarPref, sidebarCollapsed,
		inspectorPx, setInspectorWidth,
		mainRef, filterIconOnly, searchNarrow,
	} = useDeskShell("inspector-width");

	const [modal, setModal] = useState<LedgerModal | null>(null);

	const { accounts, categories, summary, refresh } = useLedgerData({
		ledgerId,
		initialLedgerId,
		month,
		initialMonth: initial.month,
		accountIds,
		categoryIds,
		initial,
		onFiltersPruned: (nextAccountIds, nextCategoryIds) => {
			setAccountIds(nextAccountIds);
			setCategoryIds(nextCategoryIds);
		},
	});

	const ledger = ledgers.find((l) => l.id === ledgerId) ?? ledgers[0];
	const range = useMemo(() => monthRange(month), [month]);

	useEffect(() => {
		setAccountIds([]);
		setCategoryIds([]);
		setSelectedId(null);
	}, [ledgerId]);

	const initialPage: InitialPage = useMemo(
		() => ({
			query: { ledgerId: initialLedgerId, ...monthRange(initial.month) },
			page: initial.page,
		}),
		[initialLedgerId, initial.month, initial.page],
	);

	const paged = usePagedEntries(
		{
			ledgerId,
			from: range.from,
			to: range.to,
			accountId: accountIds.length ? accountIds : undefined,
			categoryId: categoryIds.length ? categoryIds : undefined,
			kind: kinds.length ? kinds : undefined,
		},
		ledger.currency,
		initialPage,
	);

	async function refreshAll() {
		setModal(null);
		await refresh();
		paged.reload();
		router.refresh();
	}

	const inkOf = useMemo(() => buildInkLookup(categories), [categories]);

	const visible = loadedFilter
		? paged.rows.filter((r) => r.description.toLowerCase().includes(loadedFilter.toLowerCase()))
		: paged.rows;

	const unsettled = accounts
		.filter((account) => accountIds.length === 0 || accountIds.includes(account.id))
        .map((account) => ({
            account,
            owed: unsettledMinor(account),
        }))
        .filter(({ owed }) => owed > 0);

	const activeFilters = kinds.length + accountIds.length + categoryIds.length;

	function toggleAccount(id: string) {
		setTab("ledger");
		setSelectedId(null);
		setAccountIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
	}

	function toggleCategory(id: string) {
		setTab("ledger");
		setSelectedId(null);
		setCategoryIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
	}

	if (!ledger) {
		return <EmptyState icon="inbox" title={t("sidebar.noLedgers")} />;
	}

	const sidebar = (variant: "pane" | "drawer") => (
		<Sidebar
			variant={variant}
			ledgers={ledgers}
			ledgerId={ledgerId}
			accounts={accounts}
			categories={categories}
			inkOf={inkOf}
			tab={tab}
			accountIds={accountIds}
			categoryIds={categoryIds}
			user={viewer}
			collapsed={sidebarCollapsed}
			onToggleCollapsed={() => setSidebarPref(!sidebarPref)}
			onTab={(next) => {
				setTab(next);
				setDrawerOpen(false);
			}}
			onLedger={(id) => {
				selectLedger(id);
				setDrawerOpen(false);
			}}

			onAccount={toggleAccount}
			onCategory={toggleCategory}
			onNewLedger={() => setModal({ kind: "new-ledger" })}
			onJoinLedger={() => setModal({ kind: "join" })}
			onNewAccount={() => setModal({ kind: "new-account" })}
			onNewCategory={() => setModal({ kind: "new-category" })}
			onEditLedger={(id) => {
				const target = ledgers.find((l) => l.id === id);
				if (target) setModal({ kind: "edit-ledger", ledger: target });
			}}
			onEditAccount={(id) => {
				const target = accounts.find((a) => a.id === id);
				if (target) setModal({ kind: "edit-account", account: target });
			}}
			onEditCategory={(id) => {
				const target = flatten(categories).find((c) => c.id === id);
				if (target) setModal({ kind: "edit-category", category: target });
			}}
		/>
	);

	const filterControls = (
		<>
			<span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)" }}>{t("toolbar.kind")}</span>
			<SegmentedControl
				value={kinds}
				onChange={(v: string[]) => setKinds(v as JournalEntryKind[])}
				options={[
					{ value: "EXPENSE", label: t("kind.expenseShort") },
					{ value: "INCOME", label: t("kind.incomeShort") },
					{ value: "TRANSFER", label: t("kind.transferShort") },
				]}
				style={{ display: "flex" }}
			/>
			<span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)", textWrap: "pretty" }}>
				{kinds.length ? t("toolbar.kindSome") : t("toolbar.kindAll")}
			</span>
		</>
	);

	function clearFilters() {
		setKinds([]);
		setAccountIds([]);
		setCategoryIds([]);
	}

	const monthNav = (
		<div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
			<IconButton icon="chevron-left" label={t("toolbar.previousMonth")} onClick={() => setMonth(shiftMonth(month, -1))} />
			<div style={{ width: "var(--month-label-width)", display: "flex", justifyContent: "center" }}>
				<MonthPicker month={month} onMonth={setMonth} />
			</div>
			<IconButton icon="chevron-right" label={t("toolbar.nextMonth")} onClick={() => setMonth(shiftMonth(month, 1))} />
		</div>
	);

	const entryCountLabel = paged.total === 1
		? t("slip.entryCountOne", { currency: ledger.currency })
		: t("slip.entryCount", { count: paged.total, currency: ledger.currency });

	const modals = (
		<LedgerModals
			modal={modal}
			ledger={ledger}
			viewer={viewer}
			accounts={accounts}
			categories={categories}
			selectedId={selectedId}
			onClose={() => setModal(null)}
			onSaved={() => void refreshAll()}
			onEntryDeselect={() => setSelectedId(null)}
			onLedgerSelected={selectLedger}
			onLedgerDeleted={() => {
				setModal(null);
				router.replace("/");
			}}
			onLeft={() => {
				setModal(null);
				router.push("/");
			}}
		/>
	);

	const totals = paged.done && summary ? (
		<>
			<TotalLine
				label={t("slip.balance")}
				value={<Amount amountMinor={summary.netMinor} currency={ledger.currency} showCode={false} />}
			/>
			{unsettled.map(({ account, owed }) => (
				<TotalLine
					key={account.id}
					label={t("slip.cardUnsettled")}
					account={account.name}
					strong={false}
					value={<Amount amountMinor={owed} currency={account.currency} signed={false} showCode={false} size="sm" />}
				/>
			))}
			<Breakdown summary={summary} ledger={ledger} inkOf={inkOf} />
			<div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-6) 0 var(--space-8)", marginTop: "var(--space-5)", borderTop: "var(--rule-section)", font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)" }}>
				<span>MONEVO</span>
				<span>{monthLabel(month, locale)}</span>
			</div>
		</>
	) : null;

	if (phone) {
		const tabs: PhoneTab<LedgerTab>[] = [
			{ id: "ledger", icon: "book-open", label: t("sidebar.ledgerView") },
			{ id: "accounts", icon: "wallet", label: t("accounts.title") },
			{ id: "insights", icon: "chart-no-axes-column", label: t("sidebar.insights") },
			{ id: "members", icon: "users", label: t("sidebar.members") },
		];

		return (
			<PhoneShell>
				<PhoneNavBar
					leading={<MenuButton onClick={() => setDrawerOpen(true)} />}
					title={ledger.name}
					meta={entryCountLabel}
					trailing={
						<>
							{tab === "ledger" ? (
								<IconButton
									icon="sliders-horizontal"
									label={t("toolbar.filter")}
									onClick={() => setFilterOpen(true)}
								/>
							) : null}
							<FabLink href="/profile" label={t("toolbar.yourProfile")}>
								<Avatar name={viewer.displayName} size={28} color="var(--ink-1)" />
							</FabLink>
						</>
					}
				/>

				{tab === "ledger" ? (
					<div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", padding: "var(--space-2) var(--space-6)", borderBottom: "var(--rule-section)", background: "var(--surface-paper)" }}>
						{monthNav}
					</div>
				) : null}

				<div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingBottom: "calc(var(--fab-size) + var(--space-16))" }}>
					<LedgerPanels
						tab={tab}
						ledger={ledger}
						viewerId={viewer.id}
						accounts={accounts}
						categories={categories}
						summary={summary}
						month={month}
						accountIds={accountIds}
						categoryIds={categoryIds}
						inkOf={inkOf}
						onMonth={setMonth}
						onNewAccount={() => setModal({ kind: "new-account" })}
						onManageLinks={() => setModal({ kind: "account-links" })}
						onEditAccount={(account) => setModal({ kind: "edit-account", account })}
						onNewCategory={() => setModal({ kind: "new-category" })}
						onEditCategory={(category) => setModal({ kind: "edit-category", category })}
						onLeft={() => router.push("/")}
					>
						<>
							<PhoneSummary summary={summary} ledger={ledger} entryCount={paged.total} />

							{paged.error ? <EmptyState icon="circle-x" title={paged.error.message} /> : null}

							{!paged.error && visible.length === 0 && paged.done ? (
								<EmptyState icon="inbox" title={t("slip.noTransactions")} />
							) : null}

							{visible.map((entry) => (
								<PhoneEntryRow
									key={entry.id}
									entry={entry}
									ledger={ledger}
									inkOf={inkOf}
									selected={entry.id === selectedId}
									onClick={() => setSelectedId(entry.id)}
								/>
							))}

							{!paged.done ? <PrintingRule loaded={paged.loaded} total={paged.total} ref={paged.sentinel} /> : null}

							{paged.done && summary ? (
								<>
									<PhoneTotal
										label={t("slip.balance")}
										value={<Amount amountMinor={summary.netMinor} currency={ledger.currency} showCode={false} />}
									/>
									{unsettled.map(({ account, owed }) => (
										<PhoneTotal
											key={account.id}
											label={t("slip.cardUnsettled")}
											account={account.name}
											value={<Amount amountMinor={owed} currency={account.currency} signed={false} showCode={false} size="sm" />}
										/>
									))}
									<div style={{ padding: "0 var(--space-6)" }}>
										<Breakdown summary={summary} ledger={ledger} inkOf={inkOf} />
									</div>
								</>
							) : null}
						</>
					</LedgerPanels>
				</div>

				{tab === "ledger" ? (
					<div style={PHONE_FAB_STACK}>
						<PhoneFab icon="plus" label={t("toolbar.add")} onClick={() => setModal({ kind: "new-entry" })} />
					</div>
				) : null}

				<PhoneTabBar tabs={tabs} tab={tabs.some((x) => x.id === tab) ? tab : null} onTab={setTab} />

				<PhoneDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
					{sidebar("drawer")}
				</PhoneDrawer>

				{filterOpen ? (
					<Sheet
						title={t("toolbar.filter")}
						onDismiss={() => setFilterOpen(false)}
						footer={
							<div className="ds-sheet-actions">
								<Button size="lg" onClick={clearFilters} disabled={!activeFilters}>{t("toolbar.clear")}</Button>
								<Button size="lg" variant="primary" onClick={() => setFilterOpen(false)}>{t("toolbar.done")}</Button>
							</div>
						}
					>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
							<Input
								icon="search"
								placeholder={t("toolbar.filterLoadedRows")}
								value={loadedFilter}
								onChange={(e) => setLoadedFilter(e.target.value)}
								size="lg"
							/>
							{filterControls}
						</div>
					</Sheet>
				) : null}

				<Inspector

					width={0}
					entryId={selectedId}
					inkOf={inkOf}
					onClose={() => setSelectedId(null)}
					onEdit={(entry) => {
						setSelectedId(null);
						setModal({ kind: "edit-entry", entry });
					}}
				/>

				{modals}
			</PhoneShell>
		);
	}

	return (
		<div style={SHELL}>
			{sidebar("pane")}

			<main ref={mainRef} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
				<Toolbar
					title={ledger.name}
					subtitle={entryCountLabel}
					leading={

						monthNav
					}
					style={{ background: "var(--surface-desk)", borderBottom: "var(--hairline) solid var(--desk-3)" }}
				>
					<Input
						icon="search"
						placeholder={searchNarrow ? t("toolbar.filterShort") : t("toolbar.filterLoadedRows")}
						value={loadedFilter}
						onChange={(e) => setLoadedFilter(e.target.value)}
						style={searchNarrow ? SEARCH_BOX_NARROW : SEARCH_BOX}
					/>

					<div style={{ position: "relative" }}>
						<Button
							icon="sliders-horizontal"
							active={filterOpen}
							aria-label={t("toolbar.filter")}
							title={filterIconOnly ? t("toolbar.filter") : undefined}
							onClick={() => setFilterOpen(!filterOpen)}
						>
							{filterIconOnly
								? (activeFilters ? String(activeFilters) : null)
								: activeFilters === 0 ? t("toolbar.filter") : activeFilters === 1 ? t("toolbar.filterCountOne") : t("toolbar.filterCount", { count: activeFilters })}
						</Button>
						{filterOpen ? (
							<div style={FILTER_POPOVER}>
								{filterControls}
								<div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "var(--rule-row)" }}>
									<Button onClick={clearFilters} disabled={!activeFilters} style={{ flex: 1 }}>
										{t("toolbar.clear")}
									</Button>
									<Button variant="primary" onClick={() => setFilterOpen(false)} style={{ flex: 1 }}>{t("toolbar.done")}</Button>
								</div>
							</div>
						) : null}
					</div>

				</Toolbar>

				<div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "var(--space-14) var(--space-12) calc(var(--fab-size) + var(--space-16))" }}>
					<LedgerPanels
						tab={tab}
						ledger={ledger}
						viewerId={viewer.id}
						accounts={accounts}
						categories={categories}
						summary={summary}
						month={month}
						accountIds={accountIds}
						categoryIds={categoryIds}
						inkOf={inkOf}
						onMonth={setMonth}
						onNewAccount={() => setModal({ kind: "new-account" })}
						onManageLinks={() => setModal({ kind: "account-links" })}
						onEditAccount={(account) => setModal({ kind: "edit-account", account })}
						onNewCategory={() => setModal({ kind: "new-category" })}
						onEditCategory={(category) => setModal({ kind: "edit-category", category })}
						onLeft={() => router.push("/")}
					>
					<div style={{ position: "relative", width: "var(--slip-width)", minWidth: "var(--slip-width-min)", maxWidth: "100%", flex: "0 1 auto", background: "var(--surface-paper)", padding: "0 var(--slip-gutter)", boxShadow: "var(--shadow-paper)" }}>
						<span style={{ position: "absolute", left: 0, right: 0, top: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />
						<span style={{ position: "absolute", left: 0, right: 0, bottom: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />

						<SlipHeader ledger={ledger} month={month} />
						<SlipSummary summary={summary} ledger={ledger} />
						<ColumnHeader />

						{paged.error ? <EmptyState icon="circle-x" title={paged.error.message} /> : null}

						{!paged.error && visible.length === 0 && paged.done ? (
							<EmptyState icon="inbox" title={t("slip.noTransactions")} />
						) : null}

						{visible.map((entry) => {
							const hasFx = hasConvertedAmount(entry, ledger.currency);
							const selected = entry.id === selectedId;
							return (
								<div key={entry.id}>
									<EntryRow
										entry={entry}
										inkOf={inkOf}
										selected={selected}
										hasFx={hasFx}
										onClick={() => setSelectedId(entry.id)}
									/>
									{hasFx ? <FxLine entry={entry} ledger={ledger} selected={selected} onClick={() => setSelectedId(entry.id)} /> : null}
								</div>
							);
						})}

						{!paged.done ? <PrintingRule loaded={paged.loaded} total={paged.total} ref={paged.sentinel} /> : null}

						{totals}
					</div>
					</LedgerPanels>
				</div>

			</main>

			<div style={FAB_STACK}>
				<Fab icon="plus" label={t("toolbar.add")} primary onClick={() => setModal({ kind: "new-entry" })} />
				<Fab
					icon="users"
					label={ledger.memberCount === 1 ? t("slip.membersOne") : t("slip.members", { count: ledger.memberCount })}
					onClick={() => setModal({ kind: "members" })}
				/>
				<FabLink href="/profile" label={t("toolbar.yourProfile")}>
					<Avatar name={viewer.displayName} size={36} color="var(--ink-1)" />
				</FabLink>
			</div>

			<ResizeHandle width={inspectorPx} onWidth={setInspectorWidth} />
			<Inspector width={inspectorPx} entryId={selectedId} inkOf={inkOf} onEdit={(entry) => setModal({ kind: "edit-entry", entry })} />

			{modals}
		</div>
	);
}
