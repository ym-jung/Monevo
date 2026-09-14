"use client";

import { Badge, Button, Icon } from "@/ds";
import type { AccountDetail } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";

import { ACCOUNT_ICON, EYEBROW, ROW, SheetHeader, useSheetStyle } from "./panelChrome";

export function AccountsPanel({ accounts, viewerId, onNew, onManageLinks, onEdit }: {
	accounts: AccountDetail[];
	viewerId: string;
	onNew: () => void;
	onManageLinks: () => void;
	onEdit: (account: AccountDetail) => void;
}) {
	const sheet = useSheetStyle();
	const t = useT();
	return (
		<section style={sheet}>
			<SheetHeader label={t("accounts.title")} action={(
				<div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "flex-end" }}>
					<Button icon="link" onClick={onManageLinks}>{t("account.manageLinks")}</Button>
					<Button icon="plus" onClick={onNew}>{t("sidebar.newAccount")}</Button>
				</div>
			)} />
			{accounts.map((account) => (
				<article key={account.id} style={ROW}>
					<Icon name={ACCOUNT_ICON[account.type]} size={16} />
					<span style={{ flex: 1, minWidth: 0 }}>
						<b style={{ display: "block", font: "var(--type-body)", fontWeight: "var(--weight-medium)" }}>{account.name}</b>
						<small style={{ ...EYEBROW, letterSpacing: "var(--tracking-label)" }}>
							{t("accounts.owner", { type: account.type.replace("_", " "), owner: account.ownerDisplayName })}
						</small>
					</span>
					{account.archived ? <Badge tone="warning">{t("accounts.archived")}</Badge> : null}
					<Amount amountMinor={account.balanceMinor} currency={account.currency} />
					{account.ownerUserId === viewerId ? <Button size="sm" variant="ghost" icon="pencil" onClick={() => onEdit(account)} /> : null}
				</article>
			))}
		</section>
	);
}
