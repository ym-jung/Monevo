import type {
	AccountNature,
	AccountRef,
	AccountSubtype,
	FxRateSource,
	JournalEntryDetail,
	JournalEntryKind,
	JournalEntrySummary,
	JournalLineSide,
	JournalLineView,
	UserRef,
} from "@monevo/contracts";
import { toPlainString } from "@monevo/money";

import type { EntryRow, LineRow } from "../repository/entry-repository.ts";
import type { UsableAccount } from "./shape.ts";

const FX_RATE_SCALE = 8;

export function accountRefOf(
	accounts: ReadonlyMap<string, UsableAccount>,
	accountId: string,
): AccountRef | null {
	const account = accounts.get(accountId);
	if (!account) return null;

	const parent = account.parentId ? accounts.get(account.parentId) : undefined;

	return {
		id: account.id,
		name: account.name,
		parentName: parent?.name ?? null,
		nature: account.nature as AccountNature,
		subtype: account.subtype as AccountSubtype,
		currency: account.currency,
	};
}

function scaleRate(rate: string): string {
	const [whole = "0", fraction = ""] = rate.split(".");
	const padded = fraction.padEnd(FX_RATE_SCALE, "0").slice(0, FX_RATE_SCALE);

	return toPlainString(BigInt(`${whole}${padded}`), FX_RATE_SCALE);
}

function toLineView(line: LineRow, account: AccountRef | null): JournalLineView {
	return {
		id: line.id,
		lineNo: line.line_no,
		side: line.side as JournalLineSide,
		account,
		amountMinor: Number(line.amount_minor),
		currency: line.currency.trim(),
		baseAmountMinor: Number(line.base_amount_minor),
		fxRate: scaleRate(line.fx_rate),
		fxRateSource: line.fx_rate_source as FxRateSource,
		fxRateAsOf: line.fx_rate_as_of ? String(line.fx_rate_as_of).slice(0, 10) : null,
		memo: line.memo,
	};
}

function userRefOf(names: ReadonlyMap<string, string>, userId: string | null): UserRef | null {
	if (!userId) return null;

	const displayName = names.get(userId);
	return displayName === undefined ? null : { id: userId, displayName };
}

export function toDetail(
	entry: EntryRow,
	lines: readonly LineRow[],
	accounts: ReadonlyMap<string, UsableAccount>,
	names: ReadonlyMap<string, string>,
	baseCurrency: string | null,
): JournalEntryDetail {
	const views = lines.map((line) => toLineView(line, accountRefOf(accounts, line.account_id)));

	let debitBase = 0;
	for (const view of views) {
		if (view.side === "DEBIT") debitBase += view.baseAmountMinor;
	}

	return {
		id: entry.id,
		ledgerId: entry.ledger_id,
		kind: entry.kind as JournalEntryKind,
		entryDate: String(entry.entry_date).slice(0, 10),
		description: entry.description,
		memo: entry.memo,
		baseCurrency,
		baseAmountMinor: debitBase,
		lines: views,
		createdBy: userRefOf(names, entry.created_by_user_id),
		createdAt: new Date(entry.created_at).toISOString(),
		updatedBy: userRefOf(names, entry.updated_by),
		updatedAt: new Date(entry.updated_at).toISOString(),
		version: Number(entry.version),
	};
}

export function toSummary(
	entry: EntryRow,
	lines: readonly LineRow[],
	accounts: ReadonlyMap<string, UsableAccount>,
): JournalEntrySummary {
	const debits = lines.filter((line) => line.side === "DEBIT");

	let debitBase = 0;
	let debitAmount = 0;
	for (const line of debits) {
		debitBase += Number(line.base_amount_minor);
		debitAmount += Number(line.amount_minor);
	}
	const currencies = new Set(lines.map((line) => line.currency.trim()));
	const currency = currencies.size === 1 ? [...currencies][0]! : null;

	const sides = resolveSides(entry, lines, accounts);

	return {
		id: entry.id,
		kind: entry.kind as JournalEntryKind,
		entryDate: String(entry.entry_date).slice(0, 10),
		description: entry.description,
		lineCount: lines.length,
		baseAmountMinor: debitBase,
		amountMinor: currency === null ? null : debitAmount,
		currency,
		primaryAccount: sides.primary,
		counterAccount: sides.counter,
	};
}

function resolveSides(
	entry: EntryRow,
	lines: readonly LineRow[],
	accounts: ReadonlyMap<string, UsableAccount>,
): { primary: AccountRef | null; counter: AccountRef | null } {
	if (lines.length === 2) {
		const debit = lines[0]!.side === "DEBIT" ? lines[0]! : lines[1]!;
		const credit = lines[0]!.side === "DEBIT" ? lines[1]! : lines[0]!;

		const debitAccount = accounts.get(debit.account_id);
		const moneyIsDebit =
			debitAccount !== undefined && debitAccount.subtype === "REAL" && entry.kind !== "TRANSFER";

		return {
			primary: accountRefOf(accounts, (moneyIsDebit ? debit : credit).account_id),
			counter: accountRefOf(accounts, (moneyIsDebit ? credit : debit).account_id),
		};
	}

	const realLines = lines.filter((line) => accounts.get(line.account_id)?.subtype === "REAL");

	return {
		primary: realLines.length === 1 ? accountRefOf(accounts, realLines[0]!.account_id) : null,
		counter: null,
	};
}
