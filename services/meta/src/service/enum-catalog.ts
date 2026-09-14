import type { EnumCatalog } from "@monevo/contracts";

const CATALOG: EnumCatalog = {
	userRole: ["USER", "ADMIN"],
	userStatus: ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED", "DELETED"],
	ledgerMemberRole: ["OWNER", "MEMBER"],
	accountType: ["BANK", "CASH", "E_MONEY", "CREDIT_CARD"],
	accountNature: ["ASSET", "LIABILITY", "EQUITY", "EXPENSE", "INCOME"],
	accountSubtype: ["REAL", "CATEGORY", "SYSTEM"],
	categoryKind: ["EXPENSE", "INCOME"],
	journalEntryKind: ["EXPENSE", "INCOME", "TRANSFER", "SPLIT", "OPENING"],
	journalLineSide: ["DEBIT", "CREDIT"],
	fxRateSource: ["SAME_CURRENCY", "FX_SERVICE", "MANUAL", "DERIVED"],
};

export function enumCatalog(): EnumCatalog {
	return CATALOG;
}
