import { z } from "zod";

export const currencyMeta = z.object({
	code: z.string().length(3),
	nameKo: z.string(),
	nameJa: z.string(),
	nameEn: z.string(),
	symbol: z.string(),
	minorUnitExponent: z.number().int(),
	sortOrder: z.number().int(),
});

export type CurrencyMeta = z.infer<typeof currencyMeta>;

export const enumCatalog = z.record(z.string(), z.array(z.string()));

export type EnumCatalog = z.infer<typeof enumCatalog>;
