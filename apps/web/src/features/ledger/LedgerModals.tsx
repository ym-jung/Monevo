"use client";

import type {
	AccountDetail, CategoryNode, JournalEntryDetail, LedgerDetail, UserSummary,
} from "@/lib/api/types";

import { AccountLinksDialog, EditAccountDialog, NewAccountDialog } from "@/features/account/AccountDialogs";
import { NewCategoryDialog, EditCategoryDialog } from "@/features/category/CategoryDialogs";
import { EntrySheet } from "@/features/journal/EntrySheet";

import { EditLedgerDialog, NewLedgerDialog } from "./LedgerDialogs";
import { JoinLedgerDialog, MembersDialog } from "./MembersDialog";

export type LedgerModal =
	| { kind: "new-entry" }
	| { kind: "edit-entry"; entry: JournalEntryDetail }
	| { kind: "new-ledger" }
	| { kind: "edit-ledger"; ledger: LedgerDetail }
	| { kind: "new-account" }
	| { kind: "edit-account"; account: AccountDetail }
	| { kind: "account-links" }
	| { kind: "new-category" }
	| { kind: "edit-category"; category: CategoryNode }
	| { kind: "members" }
	| { kind: "join" };

export interface LedgerModalsProps {
	modal: LedgerModal | null;
	ledger: LedgerDetail;
	viewer: UserSummary;
	accounts: AccountDetail[];
	categories: CategoryNode[];
	selectedId: string | null;
	onClose: () => void;
	onSaved: () => void;
	onEntryDeselect: () => void;
	onLedgerSelected: (id: string) => void;
	onLedgerDeleted: () => void;
	onLeft: () => void;
}

export function LedgerModals({
	modal, ledger, viewer, accounts, categories, selectedId,
	onClose, onSaved, onEntryDeselect, onLedgerSelected, onLedgerDeleted, onLeft,
}: LedgerModalsProps) {
	return (
	<>
		{modal?.kind === "new-entry" || modal?.kind === "edit-entry" ? (
			<EntrySheet
				ledger={ledger}
				accounts={accounts}
				categories={categories}
				entry={modal.kind === "edit-entry" ? modal.entry : undefined}
				onClose={() => onClose()}
				onSaved={() => {
					if (modal.kind === "edit-entry" && modal.entry.id === selectedId) onEntryDeselect();
					void onSaved();
				}}
			/>
		) : null}

		{modal?.kind === "new-ledger" ? (
			<NewLedgerDialog onClose={() => onClose()} onSaved={(created) => onLedgerSelected(created.id)} />
		) : null}

		{modal?.kind === "edit-ledger" ? (
			<EditLedgerDialog
				ledger={modal.ledger}
				onClose={() => onClose()}
				onSaved={() => void onSaved()}
				onDeleted={() => {
					onClose();
					onLedgerDeleted();
				}}
			/>
		) : null}

		{modal?.kind === "new-account" ? (
			<NewAccountDialog ledger={ledger} onClose={() => onClose()} onSaved={() => void onSaved()} />
		) : null}

		{modal?.kind === "edit-account" ? (
			<EditAccountDialog account={modal.account} onClose={() => onClose()} onSaved={() => void onSaved()} />
		) : null}

		{modal?.kind === "account-links" ? (
			<AccountLinksDialog ledger={ledger} onClose={() => onClose()} onSaved={() => void onSaved()} />
		) : null}

		{modal?.kind === "new-category" ? (
			<NewCategoryDialog ledger={ledger} categories={categories} onClose={() => onClose()} onSaved={() => void onSaved()} />
		) : null}

		{modal?.kind === "edit-category" ? (
			<EditCategoryDialog category={modal.category} onClose={() => onClose()} onSaved={() => void onSaved()} />
		) : null}

		{modal?.kind === "members" ? (
			<MembersDialog
				ledger={ledger}
				viewerId={viewer.id}
				onClose={() => onClose()}
				onChanged={() => {

					onClose();
					onLeft();
				}}
			/>
		) : null}

		{modal?.kind === "join" ? (
			<JoinLedgerDialog onClose={() => onClose()} onJoined={(id) => onLedgerSelected(id)} />
		) : null}
	</>
	);
}
