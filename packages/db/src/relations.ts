import { relations } from "drizzle-orm/relations";
import { appUser, currency, ledger, ledgerInvite, ledgerMember, account, ledgerAccount, journalEntry, journalLine, fxRate } from "./schema";

export const appUserRelations = relations(appUser, ({one, many}) => ({
	appUser: one(appUser, {
		fields: [appUser.approvedByUserId],
		references: [appUser.id],
		relationName: "appUser_approvedByUserId_appUser_id"
	}),
	appUsers: many(appUser, {
		relationName: "appUser_approvedByUserId_appUser_id"
	}),
	currency: one(currency, {
		fields: [appUser.displayCurrency],
		references: [currency.code]
	}),
	ledgers: many(ledger),
	ledgerInvites: many(ledgerInvite),
	ledgerMembers: many(ledgerMember),
	accounts: many(account),
	journalEntries_ownerUserId: many(journalEntry, {
		relationName: "journalEntry_ownerUserId_appUser_id"
	}),
	journalEntries_createdByUserId: many(journalEntry, {
		relationName: "journalEntry_createdByUserId_appUser_id"
	}),
}));

export const currencyRelations = relations(currency, ({many}) => ({
	appUsers: many(appUser),
	ledgers: many(ledger),
	accounts: many(account),
	journalLines: many(journalLine),
	fxRates_base: many(fxRate, {
		relationName: "fxRate_base_currency_code"
	}),
	fxRates_quote: many(fxRate, {
		relationName: "fxRate_quote_currency_code"
	}),
}));

export const ledgerRelations = relations(ledger, ({one, many}) => ({
	currency: one(currency, {
		fields: [ledger.currency],
		references: [currency.code]
	}),
	appUser: one(appUser, {
		fields: [ledger.ownerUserId],
		references: [appUser.id]
	}),
	ledgerInvites: many(ledgerInvite),
	ledgerMembers: many(ledgerMember),
	accounts: many(account),
	ledgerAccounts: many(ledgerAccount),
	journalEntries: many(journalEntry),
}));

export const ledgerInviteRelations = relations(ledgerInvite, ({one, many}) => ({
	ledger: one(ledger, {
		fields: [ledgerInvite.ledgerId],
		references: [ledger.id]
	}),
	appUser: one(appUser, {
		fields: [ledgerInvite.createdByUserId],
		references: [appUser.id]
	}),
	ledgerMembers: many(ledgerMember),
}));

export const ledgerMemberRelations = relations(ledgerMember, ({one}) => ({
	ledger: one(ledger, {
		fields: [ledgerMember.ledgerId],
		references: [ledger.id]
	}),
	appUser: one(appUser, {
		fields: [ledgerMember.userId],
		references: [appUser.id]
	}),
	ledgerInvite: one(ledgerInvite, {
		fields: [ledgerMember.joinedViaInviteId],
		references: [ledgerInvite.id]
	}),
}));

export const accountRelations = relations(account, ({one, many}) => ({
	appUser: one(appUser, {
		fields: [account.ownerUserId],
		references: [appUser.id]
	}),
	currency: one(currency, {
		fields: [account.currency],
		references: [currency.code]
	}),
	ledger: one(ledger, {
		fields: [account.ledgerId],
		references: [ledger.id]
	}),
	account: one(account, {
		fields: [account.parentId],
		references: [account.id],
		relationName: "account_parentId_account_id"
	}),
	accounts: many(account, {
		relationName: "account_parentId_account_id"
	}),
	ledgerAccounts: many(ledgerAccount),
	journalLines: many(journalLine),
}));

export const ledgerAccountRelations = relations(ledgerAccount, ({one}) => ({
	ledger: one(ledger, {
		fields: [ledgerAccount.ledgerId],
		references: [ledger.id]
	}),
	account: one(account, {
		fields: [ledgerAccount.accountId],
		references: [account.id]
	}),
}));

export const journalEntryRelations = relations(journalEntry, ({one, many}) => ({
	ledger: one(ledger, {
		fields: [journalEntry.ledgerId],
		references: [ledger.id]
	}),
	appUser_ownerUserId: one(appUser, {
		fields: [journalEntry.ownerUserId],
		references: [appUser.id],
		relationName: "journalEntry_ownerUserId_appUser_id"
	}),
	appUser_createdByUserId: one(appUser, {
		fields: [journalEntry.createdByUserId],
		references: [appUser.id],
		relationName: "journalEntry_createdByUserId_appUser_id"
	}),
	journalLines: many(journalLine),
}));

export const journalLineRelations = relations(journalLine, ({one}) => ({
	journalEntry: one(journalEntry, {
		fields: [journalLine.entryId],
		references: [journalEntry.id]
	}),
	account: one(account, {
		fields: [journalLine.accountId],
		references: [account.id]
	}),
	currency: one(currency, {
		fields: [journalLine.currency],
		references: [currency.code]
	}),
}));

export const fxRateRelations = relations(fxRate, ({one}) => ({
	currency_base: one(currency, {
		fields: [fxRate.base],
		references: [currency.code],
		relationName: "fxRate_base_currency_code"
	}),
	currency_quote: one(currency, {
		fields: [fxRate.quote],
		references: [currency.code],
		relationName: "fxRate_quote_currency_code"
	}),
}));