export type UserRole = "USER" | "ADMIN";

export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "DELETED";

export type LedgerMemberRole = "OWNER" | "MEMBER";

export type AccountType = "BANK" | "CASH" | "E_MONEY" | "CREDIT_CARD";

export type CategoryKind = "EXPENSE" | "INCOME";

export type AccountNature = "ASSET" | "LIABILITY" | "EQUITY" | "EXPENSE" | "INCOME";

export type AccountSubtype = "REAL" | "CATEGORY" | "SYSTEM";

export type JournalLineSide = "DEBIT" | "CREDIT";

export type JournalEntryKind = "EXPENSE" | "INCOME" | "TRANSFER" | "SPLIT" | "OPENING";

export type FxRateSource = "SAME_CURRENCY" | "FX_SERVICE" | "MANUAL" | "DERIVED";
