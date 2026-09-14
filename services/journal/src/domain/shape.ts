import type { JournalEntryKind, JournalLineInput } from "@monevo/contracts";
import { ValidationError } from "@monevo/http";
import type { Minor } from "@monevo/money";

export interface UsableAccount {
	id: string;
	name: string;
	nature: string;
	subtype: string;
	currency: string | null;
	parentId: string | null;
	archivedAt: string | null;
	ledgerId: string | null;
}

export function validateShape(lines: readonly JournalLineInput[]): void {
	if (lines.length < 2) {
		throw new ValidationError("JOURNAL_ENTRY_SHAPE_INVALID");
	}

	const debitAccounts = new Set<string>();
	const creditAccounts = new Set<string>();

	for (const line of lines) {
		if (line.amountMinor <= 0) throw new ValidationError("TRANSACTION_AMOUNT_INVALID");

		(line.side === "DEBIT" ? debitAccounts : creditAccounts).add(line.accountId);
	}

	if (debitAccounts.size === 0 || creditAccounts.size === 0) {
		throw new ValidationError("JOURNAL_ENTRY_SHAPE_INVALID");
	}

	for (const accountId of debitAccounts) {
		if (creditAccounts.has(accountId)) {
			throw new ValidationError("JOURNAL_LINE_DUPLICATE_ACCOUNT");
		}
	}
}

export function resolveCurrency(
	line: JournalLineInput,
	account: UsableAccount,
	fallbackCurrency: string,
): string {
	if (account.subtype === "REAL") {
		if (line.currency && line.currency !== account.currency) {
			throw new ValidationError("TRANSACTION_CURRENCY_MISMATCH");
		}
		return account.currency!;
	}

	return line.currency ?? fallbackCurrency;
}

export function moneySideCurrency(
	lines: readonly JournalLineInput[],
	accounts: ReadonlyMap<string, UsableAccount>,
	baseCurrency: string,
): string {
	let found: string | null = null;

	for (const line of lines) {
		const account = accounts.get(line.accountId);
		if (!account || account.subtype !== "REAL") continue;

		if (found === null) {
			found = account.currency;
		} else if (found !== account.currency) {
			return baseCurrency;
		}
	}

	return found ?? baseCurrency;
}

export function requireBalanced(
	lines: readonly { side: string; baseAmountMinor: Minor }[],
): void {
	let diff = 0n;
	for (const line of lines) {
		diff += line.side === "DEBIT" ? line.baseAmountMinor : -line.baseAmountMinor;
	}

	if (diff !== 0n) throw new ValidationError("JOURNAL_ENTRY_UNBALANCED");
}

export function deriveKind(
	lines: readonly JournalLineInput[],
	accounts: ReadonlyMap<string, UsableAccount>,
): JournalEntryKind {
	let allMoney = true;
	let hasExpense = false;
	let hasIncome = false;

	for (const line of lines) {
		const nature = accounts.get(line.accountId)?.nature;

		if (nature === "EXPENSE") {
			hasExpense = true;
			allMoney = false;
		} else if (nature === "INCOME") {
			hasIncome = true;
			allMoney = false;
		}
	}

	if (allMoney) return "TRANSFER";
	if (hasExpense && hasIncome) return "SPLIT";

	return hasExpense ? "EXPENSE" : "INCOME";
}
