"use client";

import type { AccountDetail, CategoryNode, LedgerDetail, MonthlySummary } from "@/lib/api/types";

import type { InkLookup } from "@/features/category/ink";

import { AccountsPanel } from "./AccountsPanel";
import { CategoriesPanel } from "./CategoriesPanel";
import { InsightsPanel } from "./InsightsPanel";
import { MembersPanel } from "./MembersPanel";
import type { LedgerTab } from "./Sidebar";

export interface LedgerPanelsProps {
	tab: LedgerTab;
	ledger: LedgerDetail;
	viewerId: string;
	accounts: AccountDetail[];
	categories: CategoryNode[];
	summary: MonthlySummary | null;
	month: string;
	accountIds: string[];
	categoryIds: string[];
	inkOf: InkLookup;
	onMonth: (month: string) => void;
	onNewAccount: () => void;
	onManageLinks: () => void;
	onEditAccount: (account: AccountDetail) => void;
	onNewCategory: () => void;
	onEditCategory: (category: CategoryNode) => void;
	onLeft: () => void;
	children: React.ReactNode;
}

export function LedgerPanels(props: LedgerPanelsProps) {
	if (props.tab === "accounts") {
		return (
			<AccountsPanel
				accounts={props.accounts}
				viewerId={props.viewerId}
				onNew={props.onNewAccount}
				onManageLinks={props.onManageLinks}
				onEdit={props.onEditAccount}
			/>
		);
	}

	if (props.tab === "categories") {
		return (
			<CategoriesPanel
				categories={props.categories}
				inkOf={props.inkOf}
				onNew={props.onNewCategory}
				onEdit={props.onEditCategory}
			/>
		);
	}

	if (props.tab === "insights") {
		return (
			<InsightsPanel
				summary={props.summary}
				ledger={props.ledger}
				month={props.month}
				onMonth={props.onMonth}
				accountIds={props.accountIds}
				categoryIds={props.categoryIds}
				inkOf={props.inkOf}
			/>
		);
	}

	if (props.tab === "members") {
		return <MembersPanel ledger={props.ledger} viewerId={props.viewerId} onLeft={props.onLeft} />;
	}

	return <>{props.children}</>;
}
