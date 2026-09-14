"use client";

import { Amount } from "@/lib/money/currency";

import { signOf, type LedgerRow } from "./row";

export function ConvertedAmount({ row, baseCurrency }: { row: LedgerRow; baseCurrency: string }) {
	return (
		<>
			{signOf(row.kind) < 0 ? "−" : "+"}
			<Amount amountMinor={row.baseAmountMinor} currency={baseCurrency} signed={false} muted size="sm" />
		</>
	);
}
