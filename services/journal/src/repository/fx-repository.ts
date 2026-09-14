import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import type { Quote } from "../domain/pricer.ts";

const FRANKFURTER = "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 3000;

export interface FxRepository {
	resolve(base: string, quote: string, date: string): Promise<Quote | undefined>;
}

interface FrankfurterResponse {
	date: string;
	rates: Record<string, number>;
}

export function createFxRepository(db: Executor): FxRepository {
	const cached = async (base: string, quote: string, date: string): Promise<Quote | undefined> => {
		const rows = await db.execute<{ rate: string; as_of: string }>(sql`
			SELECT rate, as_of FROM fx_rate
			WHERE base = ${base} AND quote = ${quote} AND rate_date = ${date}::date`);

		const row = rows[0];
		return row ? { rate: row.rate, asOf: String(row.as_of).slice(0, 10) } : undefined;
	};

	const mostRecentAtOrBefore = async (
		base: string,
		quote: string,
		date: string,
	): Promise<Quote | undefined> => {
		const rows = await db.execute<{ rate: string; as_of: string }>(sql`
			SELECT rate, as_of FROM fx_rate
			WHERE base = ${base} AND quote = ${quote} AND rate_date <= ${date}::date
			ORDER BY rate_date DESC LIMIT 1`);

		const row = rows[0];
		return row ? { rate: row.rate, asOf: String(row.as_of).slice(0, 10) } : undefined;
	};

	const fetchUpstream = async (base: string, quote: string, date: string): Promise<Quote> => {
		const response = await fetch(`${FRANKFURTER}/${date}?base=${quote}&symbols=${base}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});

		if (!response.ok) throw new Error(`frankfurter returned ${response.status}`);

		const payload = (await response.json()) as FrankfurterResponse;
		const rate = payload.rates[base];
		if (rate === undefined) throw new Error(`frankfurter returned no rate for ${base}`);

		return { rate: rate.toFixed(8), asOf: payload.date };
	};

	const save = async (base: string, quote: string, date: string, value: Quote): Promise<void> => {
		await db.execute(sql`
			INSERT INTO fx_rate (base, quote, rate_date, as_of, rate, source, fetched_at)
			VALUES (${base}, ${quote}, ${date}::date, ${value.asOf}::date,
				${value.rate}::numeric, 'FRANKFURTER', now())
			ON CONFLICT (base, quote, rate_date) DO NOTHING`);
	};

	return {
		resolve: async (base, quote, date) => {
			const hit = await cached(base, quote, date);
			if (hit) return hit;

			try {
				const fetched = await fetchUpstream(base, quote, date);
				await save(base, quote, date, fetched);

				return fetched;
			} catch {
				return mostRecentAtOrBefore(base, quote, date);
			}
		},
	};
}

export { newId };
