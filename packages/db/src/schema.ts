import { pgTable, index, uniqueIndex, foreignKey, check, uuid, varchar, char, timestamp, bigint, smallint, boolean, date, text, numeric, primaryKey, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const appUser = pgTable("app_user", {
	id: uuid().primaryKey().notNull(),
	cognitoSub: uuid("cognito_sub").notNull(),
	email: varchar({ length: 255 }).notNull(),
	emailNormalized: varchar("email_normalized", { length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 60 }).notNull(),
	role: varchar({ length: 20 }).default('USER').notNull(),
	status: varchar({ length: 20 }).default('PENDING').notNull(),
	approvedByUserId: uuid("approved_by_user_id"),
	displayCurrency: char("display_currency", { length: 3 }).notNull(),
	locale: varchar({ length: 10 }).default('en').notNull(),
	timezone: varchar({ length: 64 }).default('UTC').notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	cognitoSyncedAt: timestamp("cognito_synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
	version: bigint({ mode: "number" }).default(0).notNull(),
	rejectReason: varchar("reject_reason", { length: 200 }),
}, (table) => [
	index("ix_user_status").using("btree", table.status.asc().nullsLast().op("text_ops")).where(sql`(deleted_at IS NULL)`),
	uniqueIndex("ux_user_cognito").using("btree", table.cognitoSub.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("ux_user_email").using("btree", table.emailNormalized.asc().nullsLast().op("text_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [table.id],
			name: "app_user_approved_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.displayCurrency],
			foreignColumns: [currency.code],
			name: "app_user_display_currency_fkey"
		}),
	check("ck_user_role", sql`(role)::text = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[])`),
	check("ck_user_status", sql`(status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACTIVE'::character varying, 'REJECTED'::character varying, 'SUSPENDED'::character varying, 'DELETED'::character varying])::text[])`),
	check("ck_user_locale", sql`(locale)::text = ANY ((ARRAY['ko'::character varying, 'ja'::character varying, 'en'::character varying])::text[])`),
]);

export const currency = pgTable("currency", {
	code: char({ length: 3 }).primaryKey().notNull(),
	nameKo: varchar("name_ko", { length: 50 }).notNull(),
	nameJa: varchar("name_ja", { length: 50 }).notNull(),
	nameEn: varchar("name_en", { length: 50 }).notNull(),
	symbol: varchar({ length: 8 }).notNull(),
	minorUnitExponent: smallint("minor_unit_exponent").default(0).notNull(),
	yfinanceSymbolBase: varchar("yfinance_symbol_base", { length: 20 }),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: smallint("sort_order").default(0).notNull(),
}, (table) => [
	check("ck_currency_exponent", sql`(minor_unit_exponent >= 0) AND (minor_unit_exponent <= 4)`),
]);

export const ledger = pgTable("ledger", {
	id: uuid().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	currency: char({ length: 3 }).default('USD').notNull(),
	ownerUserId: uuid("owner_user_id"),
	timezone: varchar({ length: 64 }).default('UTC').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
	version: bigint({ mode: "number" }).default(0).notNull(),
}, (table) => [
	index("ix_ledger_owner").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.currency],
			foreignColumns: [currency.code],
			name: "ledger_currency_fkey"
		}),
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [appUser.id],
			name: "ledger_owner_user_id_fkey"
		}),
]);

export const ledgerInvite = pgTable("ledger_invite", {
	id: uuid().primaryKey().notNull(),
	ledgerId: uuid("ledger_id").notNull(),
	code: varchar({ length: 12 }).notNull(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	maxUses: smallint("max_uses").default(1).notNull(),
	usedCount: smallint("used_count").default(0).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_invite_ledger").using("btree", table.ledgerId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("ux_invite_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ledgerId],
			foreignColumns: [ledger.id],
			name: "ledger_invite_ledger_id_fkey"
		}),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [appUser.id],
			name: "ledger_invite_created_by_user_id_fkey"
		}),
	check("ck_invite_uses", sql`(max_uses > 0) AND (used_count >= 0) AND (used_count <= max_uses)`),
]);

export const ledgerMember = pgTable("ledger_member", {
	id: uuid().primaryKey().notNull(),
	ledgerId: uuid("ledger_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar({ length: 10 }).notNull(),
	joinedViaInviteId: uuid("joined_via_invite_id"),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
}, (table) => [
	index("ix_member_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	uniqueIndex("ux_member_ledger_user").using("btree", table.ledgerId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	uniqueIndex("ux_member_single_owner").using("btree", table.ledgerId.asc().nullsLast().op("uuid_ops")).where(sql`(((role)::text = 'OWNER'::text) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.ledgerId],
			foreignColumns: [ledger.id],
			name: "ledger_member_ledger_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUser.id],
			name: "ledger_member_user_id_fkey"
		}),
	foreignKey({
			columns: [table.joinedViaInviteId],
			foreignColumns: [ledgerInvite.id],
			name: "ledger_member_joined_via_invite_id_fkey"
		}),
	check("ck_member_role", sql`(role)::text = ANY ((ARRAY['OWNER'::character varying, 'MEMBER'::character varying])::text[])`),
]);

export const account = pgTable("account", {
	id: uuid().primaryKey().notNull(),
	ownerUserId: uuid("owner_user_id"),
	name: varchar({ length: 50 }).notNull(),
	type: varchar({ length: 20 }),
	currency: char({ length: 3 }),
	memo: varchar({ length: 200 }),
	sortOrder: smallint("sort_order").default(0).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
	version: bigint({ mode: "number" }).default(0).notNull(),
	nature: varchar({ length: 10 }).notNull(),
	subtype: varchar({ length: 10 }).notNull(),
	ledgerId: uuid("ledger_id"),
	parentId: uuid("parent_id"),
	isSystem: boolean("is_system").default(false).notNull(),
}, (table) => [
	index("ix_account_ledger").using("btree", table.ledgerId.asc().nullsLast().op("uuid_ops")).where(sql`((deleted_at IS NULL) AND (ledger_id IS NOT NULL))`),
	index("ix_account_owner").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	index("ix_account_parent").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")).where(sql`((deleted_at IS NULL) AND (parent_id IS NOT NULL))`),
	uniqueIndex("ux_account_category_sibling").using("btree", sql`ledger_id`, sql`COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uui`, sql`lower((name)::text)`).where(sql`((deleted_at IS NULL) AND ((subtype)::text = 'CATEGORY'::text))`),
	uniqueIndex("ux_account_owner_name").using("btree", sql`owner_user_id`, sql`lower((name)::text)`).where(sql`((deleted_at IS NULL) AND ((subtype)::text = 'REAL'::text))`),
	uniqueIndex("ux_account_system_owner").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops")).where(sql`((deleted_at IS NULL) AND ((subtype)::text = 'SYSTEM'::text))`),
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [appUser.id],
			name: "account_owner_user_id_fkey"
		}),
	foreignKey({
			columns: [table.currency],
			foreignColumns: [currency.code],
			name: "account_currency_fkey"
		}),
	foreignKey({
			columns: [table.ledgerId],
			foreignColumns: [ledger.id],
			name: "account_ledger_id_fkey"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "account_parent_id_fkey"
		}),
	check("ck_account_type", sql`(type)::text = ANY ((ARRAY['BANK'::character varying, 'CASH'::character varying, 'E_MONEY'::character varying, 'CREDIT_CARD'::character varying])::text[])`),
	check("ck_account_nature", sql`(nature)::text = ANY ((ARRAY['ASSET'::character varying, 'LIABILITY'::character varying, 'EQUITY'::character varying, 'EXPENSE'::character varying, 'INCOME'::character varying])::text[])`),
	check("ck_account_subtype", sql`(subtype)::text = ANY ((ARRAY['REAL'::character varying, 'CATEGORY'::character varying, 'SYSTEM'::character varying])::text[])`),
	check("ck_account_nature_subtype", sql`(((subtype)::text = 'REAL'::text) AND ((nature)::text = ANY ((ARRAY['ASSET'::character varying, 'LIABILITY'::character varying])::text[]))) OR (((subtype)::text = 'CATEGORY'::text) AND ((nature)::text = ANY ((ARRAY['EXPENSE'::character varying, 'INCOME'::character varying])::text[]))) OR (((subtype)::text = 'SYSTEM'::text) AND ((nature)::text = 'EQUITY'::text))`),
	check("ck_account_shape", sql`(((subtype)::text = 'REAL'::text) AND (owner_user_id IS NOT NULL) AND (currency IS NOT NULL) AND (type IS NOT NULL) AND (ledger_id IS NULL) AND (parent_id IS NULL)) OR (((subtype)::text = 'CATEGORY'::text) AND (ledger_id IS NOT NULL) AND (owner_user_id IS NULL) AND (currency IS NULL) AND (type IS NULL)) OR (((subtype)::text = 'SYSTEM'::text) AND (owner_user_id IS NOT NULL) AND (currency IS NULL) AND (type IS NULL) AND (ledger_id IS NULL) AND (parent_id IS NULL))`),
]);

export const ledgerAccount = pgTable("ledger_account", {
	id: uuid().primaryKey().notNull(),
	ledgerId: uuid("ledger_id").notNull(),
	accountId: uuid("account_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
}, (table) => [
	index("ix_ledger_account_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	uniqueIndex("ux_ledger_account_active").using("btree", table.ledgerId.asc().nullsLast().op("uuid_ops"), table.accountId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.ledgerId],
			foreignColumns: [ledger.id],
			name: "ledger_account_ledger_id_fkey"
		}),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [account.id],
			name: "ledger_account_account_id_fkey"
		}),
]);

export const journalEntry = pgTable("journal_entry", {
	id: uuid().primaryKey().notNull(),
	ledgerId: uuid("ledger_id"),
	ownerUserId: uuid("owner_user_id"),
	kind: varchar({ length: 10 }).notNull(),
	entryDate: date("entry_date").notNull(),
	description: varchar({ length: 200 }).notNull(),
	memo: text(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	clientRequestId: uuid("client_request_id").notNull(),
	createRequestHash: varchar("create_request_hash", { length: 64 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
	version: bigint({ mode: "number" }).default(0).notNull(),
}, (table) => [
	index("ix_entry_ledger_date").using("btree", table.ledgerId.asc().nullsLast().op("date_ops"), table.entryDate.desc().nullsFirst().op("uuid_ops"), table.id.desc().nullsFirst().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	index("ix_entry_owner").using("btree", table.ownerUserId.asc().nullsLast().op("uuid_ops")).where(sql`((deleted_at IS NULL) AND (owner_user_id IS NOT NULL))`),
	uniqueIndex("ux_entry_creator_client_request").using("btree", table.createdByUserId.asc().nullsLast().op("uuid_ops"), table.clientRequestId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ledgerId],
			foreignColumns: [ledger.id],
			name: "journal_entry_ledger_id_fkey"
		}),
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [appUser.id],
			name: "journal_entry_owner_user_id_fkey"
		}),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [appUser.id],
			name: "journal_entry_created_by_user_id_fkey"
		}),
	check("ck_entry_kind", sql`(kind)::text = ANY ((ARRAY['EXPENSE'::character varying, 'INCOME'::character varying, 'TRANSFER'::character varying, 'SPLIT'::character varying, 'OPENING'::character varying])::text[])`),
	check("ck_entry_scope", sql`num_nonnulls(ledger_id, owner_user_id) = 1`),
]);

export const journalLine = pgTable("journal_line", {
	id: uuid().primaryKey().notNull(),
	entryId: uuid("entry_id").notNull(),
	lineNo: smallint("line_no").notNull(),
	side: varchar({ length: 6 }).notNull(),
	accountId: uuid("account_id").notNull(),
	currency: char({ length: 3 }).notNull(),
	amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
	fxRate: numeric("fx_rate", { precision: 18, scale:  8 }).notNull(),
	baseAmountMinor: bigint("base_amount_minor", { mode: "bigint" }).notNull(),
	fxRateSource: varchar("fx_rate_source", { length: 15 }).notNull(),
	fxRateAsOf: date("fx_rate_as_of"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedBy: uuid("updated_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: uuid("deleted_by"),
	memo: text(),
}, (table) => [
	index("ix_line_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	index("ix_line_entry").using("btree", table.entryId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.entryId],
			foreignColumns: [journalEntry.id],
			name: "journal_line_entry_id_fkey"
		}),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [account.id],
			name: "journal_line_account_id_fkey"
		}),
	foreignKey({
			columns: [table.currency],
			foreignColumns: [currency.code],
			name: "journal_line_currency_fkey"
		}),
	check("ck_line_side", sql`(side)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])`),
	check("ck_line_amount", sql`(amount_minor > 0) AND (base_amount_minor > 0)`),
	check("ck_line_fx_rate", sql`fx_rate > (0)::numeric`),
	check("ck_line_fx_source", sql`(fx_rate_source)::text = ANY ((ARRAY['SAME_CURRENCY'::character varying, 'FX_SERVICE'::character varying, 'MANUAL'::character varying, 'DERIVED'::character varying])::text[])`),
]);

export const fxRate = pgTable("fx_rate", {
	base: char({ length: 3 }).notNull(),
	quote: char({ length: 3 }).notNull(),
	rateDate: date("rate_date").notNull(),
	rate: numeric({ precision: 18, scale:  8 }).notNull(),
	source: varchar({ length: 20 }).notNull(),
	fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	asOf: date("as_of").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.base],
			foreignColumns: [currency.code],
			name: "fx_rate_base_fkey"
		}),
	foreignKey({
			columns: [table.quote],
			foreignColumns: [currency.code],
			name: "fx_rate_quote_fkey"
		}),
	primaryKey({ columns: [table.rateDate, table.quote, table.base], name: "fx_rate_pkey"}),
	check("ck_fx_rate_positive", sql`rate > (0)::numeric`),
	check("ck_fx_rate_different", sql`base <> quote`),
]);
export const vAccountBalance = pgView("v_account_balance", {	accountId: uuid("account_id"),
	ownerUserId: uuid("owner_user_id"),
	currency: char({ length: 3 }),
	balanceMinor: bigint("balance_minor", { mode: "bigint" }),
}).as(sql`SELECT a.id AS account_id, a.owner_user_id, a.currency, COALESCE(sum( CASE WHEN l.side::text = 'DEBIT'::text THEN l.amount_minor ELSE - l.amount_minor END), 0::numeric)::bigint AS balance_minor FROM account a LEFT JOIN journal_line l ON l.account_id = a.id AND l.deleted_at IS NULL LEFT JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL WHERE a.deleted_at IS NULL AND a.subtype::text = 'REAL'::text GROUP BY a.id, a.owner_user_id, a.currency`);