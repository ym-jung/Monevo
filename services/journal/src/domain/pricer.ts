import type { FxRateSource, JournalLineSide } from "@monevo/contracts";
import { ValidationError } from "@monevo/http";
import type { Minor } from "@monevo/money";
import { allocate, convert, divideHalfUp, parseDecimal, pow10, toMinor, toPlainString } from "@monevo/money";

const FX_RATE_SCALE = 8;
const SMALLEST_RATE = "0.00000001";

export interface LineRequest {
	side: JournalLineSide;
	accountId: string;
	currency: string;
	amountMinor: number;
	requestedRate: string | null;
	memo: string | null;
}

export interface PricedLine {
	side: JournalLineSide;
	accountId: string;
	currency: string;
	amountMinor: Minor;
	fxRate: string;
	baseAmountMinor: Minor;
	source: FxRateSource;
	asOf: string | null;
	memo: string | null;
}

export interface Quote {
	rate: string;
	asOf: string;
}

export interface PricingContext {
	baseCurrency: string;
	exponentOf(currency: string): number;
	quoteFor(currency: string): Quote | undefined;
}

export function price(requests: readonly LineRequest[], context: PricingContext): PricedLine[] {
	return balance(
		requests.map((request) => convertLine(request, context)),
		context,
	);
}

function convertLine(request: LineRequest, context: PricingContext): PricedLine {
	if (request.currency === context.baseCurrency) {
		const amount = toMinor(request.amountMinor);

		return {
			side: request.side,
			accountId: request.accountId,
			currency: request.currency,
			amountMinor: amount,
			fxRate: "1",
			baseAmountMinor: amount,
			source: "SAME_CURRENCY",
			asOf: null,
			memo: request.memo,
		};
	}

	if (request.requestedRate !== null) {
		if (parseDecimal(request.requestedRate).unscaled <= 0n) {
			throw new ValidationError("FX_RATE_INVALID");
		}

		return build(request, context, request.requestedRate, "MANUAL", null);
	}

	const quote = context.quoteFor(request.currency);
	if (!quote) throw new ValidationError("FX_RATE_UNAVAILABLE");

	return build(request, context, quote.rate, "FX_SERVICE", quote.asOf);
}

function build(
	request: LineRequest,
	context: PricingContext,
	rate: string,
	source: FxRateSource,
	asOf: string | null,
): PricedLine {
	const amount = toMinor(request.amountMinor);

	return {
		side: request.side,
		accountId: request.accountId,
		currency: request.currency,
		amountMinor: amount,
		fxRate: rate,
		baseAmountMinor: convert(
			amount,
			context.exponentOf(request.currency),
			context.exponentOf(context.baseCurrency),
			rate,
		),
		source,
		asOf,
		memo: request.memo,
	};
}

function sideTotal(lines: readonly PricedLine[], side: JournalLineSide): bigint {
	let total = 0n;
	for (const line of lines) {
		if (line.side === side) total += line.baseAmountMinor;
	}

	return total;
}

function allInBaseCurrency(
	lines: readonly PricedLine[],
	side: JournalLineSide,
	baseCurrency: string,
): boolean {
	let seen = 0;
	for (const line of lines) {
		if (line.side !== side) continue;
		if (line.currency !== baseCurrency) return false;

		seen += 1;
	}

	return seen > 0;
}

function anchorSide(lines: readonly PricedLine[], baseCurrency: string): JournalLineSide {
	const debitPinned = allInBaseCurrency(lines, "DEBIT", baseCurrency);
	const creditPinned = allInBaseCurrency(lines, "CREDIT", baseCurrency);

	return debitPinned && !creditPinned ? "DEBIT" : "CREDIT";
}

function balance(lines: PricedLine[], context: PricingContext): PricedLine[] {
	const debitTotal = sideTotal(lines, "DEBIT");
	const creditTotal = sideTotal(lines, "CREDIT");
	if (debitTotal === creditTotal) return lines;

	const anchor = anchorSide(lines, context.baseCurrency);
	const anchoredTotal = anchor === "DEBIT" ? debitTotal : creditTotal;
	const opposite = anchor === "DEBIT" ? "CREDIT" : "DEBIT";

	const targets = lines
		.map((line, index) => ({ line, index }))
		.filter((entry) => entry.line.side === opposite);

	let shares: Minor[];
	try {
		shares = allocate(
			toMinor(anchoredTotal),
			targets.map((entry) => entry.line.baseAmountMinor),
		);
	} catch {
		throw new ValidationError("JOURNAL_ENTRY_UNBALANCED");
	}

	const result = [...lines];
	targets.forEach((entry, position) => {
		const share = shares[position]!;
		if (entry.line.baseAmountMinor === share) return;

		if (entry.line.currency === context.baseCurrency) {
			throw new ValidationError("JOURNAL_ENTRY_UNBALANCED");
		}

		result[entry.index] = {
			...entry.line,
			fxRate: deriveRate(entry.line.amountMinor, share, entry.line.currency, context),
			baseAmountMinor: share,
			source: "DERIVED",
			asOf: null,
		};
	});

	return result;
}

function deriveRate(
	amountMinor: Minor,
	baseAmountMinor: Minor,
	currency: string,
	context: PricingContext,
): string {
	const shift = context.exponentOf(currency) - context.exponentOf(context.baseCurrency);

	let numerator = baseAmountMinor * pow10(FX_RATE_SCALE);
	if (shift > 0) numerator *= pow10(shift);
	else if (shift < 0) numerator = divideHalfUp(numerator, pow10(-shift));

	const unscaled = divideHalfUp(numerator, amountMinor);

	return unscaled > 0n ? toPlainString(unscaled, FX_RATE_SCALE) : SMALLEST_RATE;
}
