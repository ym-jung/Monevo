"use client";

import { useState } from "react";

import { Badge, Button, Icon } from "@/ds";
import type { AccountDetail } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";

import { linkAccount, updateAccount } from "@/features/account/api";
import { groupAccounts } from "@/features/account/grouping";
import { DialogError } from "@/features/common/DialogForm";

import { ACCOUNT_ICON, EYEBROW, ROW, SheetHeader, useSheetStyle } from "./panelChrome";

const SECTION: React.CSSProperties = { ...EYEBROW, padding: "var(--space-8) 0 var(--space-3)" };

export function AccountsPanel({
	accounts, ownedAccounts, ledgerId, viewerId, onNew, onManageLinks, onEdit, onChanged,
}: {
	accounts: AccountDetail[];
	ownedAccounts: AccountDetail[];
	ledgerId: string;
	viewerId: string;
	onNew: () => void;
	onManageLinks: () => void;
	onEdit: (account: AccountDetail) => void;
	onChanged: () => void | Promise<void>;
}) {
	const sheet = useSheetStyle();
	const t = useT();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<unknown>(null);

	const { linked, unlinked, archived } = groupAccounts(accounts, ownedAccounts);

	async function run(account: AccountDetail, action: () => Promise<unknown>) {
		setBusyId(account.id);
		setError(null);
		try {
			await action();
			await onChanged();
		} catch (err) {
			setError(err);
		} finally {
			setBusyId(null);
		}
	}

	function rows(label: string, list: AccountDetail[], trailing?: (account: AccountDetail) => React.ReactNode) {
		if (list.length === 0) return null;
		return (
			<div>
				<div style={SECTION}>{label}</div>
				{list.map((account) => (
					<AccountRow
						key={account.id}
						account={account}
						ledgerId={ledgerId}
						viewerId={viewerId}
						onEdit={onEdit}
						busy={busyId === account.id}
						trailing={trailing?.(account)}
					/>
				))}
			</div>
		);
	}

	return (
		<section style={sheet}>
			<SheetHeader label={t("accounts.title")} action={(
				<div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "flex-end" }}>
					<Button icon="link" onClick={onManageLinks}>{t("account.manageLinks")}</Button>
					<Button icon="plus" onClick={onNew}>{t("sidebar.newAccount")}</Button>
				</div>
			)} />
			<DialogError error={error} />
			{rows(t("accounts.section.linked"), linked)}
			{rows(t("accounts.section.unlinked"), unlinked, (account) => (
				<Button
					size="sm"
					icon="link"
					disabled={busyId !== null}
					onClick={() => void run(account, () => linkAccount(account.id, ledgerId))}
				>
					{t("account.link")}
				</Button>
			))}
			{rows(t("accounts.section.archived"), archived, (account) => (
				<Button
					size="sm"
					icon="refresh-cw"
					disabled={busyId !== null}
					onClick={() => void run(account, () => updateAccount(account.id, { archived: false, version: account.version }))}
				>
					{t("account.restore")}
				</Button>
			))}
		</section>
	);
}

function AccountRow({ account, ledgerId, viewerId, onEdit, busy, trailing }: {
	account: AccountDetail;
	ledgerId: string;
	viewerId: string;
	onEdit: (account: AccountDetail) => void;
	busy: boolean;
	trailing?: React.ReactNode;
}) {
	const t = useT();
	const owned = account.ownerUserId === viewerId;
	const elsewhere = account.ledgerIds.filter((id) => id !== ledgerId).length;

	return (
		<article style={{ ...ROW, opacity: busy ? 0.5 : undefined }}>
			<Icon name={ACCOUNT_ICON[account.type]} size={16} />
			<span style={{ flex: 1, minWidth: 0 }}>
				<b style={{ display: "block", font: "var(--type-body)", fontWeight: "var(--weight-medium)" }}>{account.name}</b>
				<small style={{ ...EYEBROW, letterSpacing: "var(--tracking-label)" }}>
					{t("accounts.owner", { type: account.type.replace("_", " "), owner: account.ownerDisplayName })}
					{owned && elsewhere ? ` · ${t("accounts.linkedElsewhere", { n: elsewhere })}` : ""}
				</small>
			</span>
			{account.archived ? <Badge tone="warning">{t("accounts.archived")}</Badge> : null}
			<Amount amountMinor={account.balanceMinor} currency={account.currency} />
			{owned ? <Button size="sm" variant="ghost" icon="pencil" onClick={() => onEdit(account)} /> : null}
			{owned ? trailing : null}
		</article>
	);
}
