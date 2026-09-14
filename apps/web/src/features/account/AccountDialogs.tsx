"use client";

import { useEffect, useState } from "react";

import { Button, Checkbox, Input, Select } from "@/ds";
import type { AccountDetail, AccountType, LedgerDetail } from "@/lib/api/types";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/provider";
import { useCurrencies, useMinorUnitExponent } from "@/lib/money/currency";

import { DialogError, DialogField, toMinor } from "@/features/common/DialogForm";
import { Modal } from "@/features/common/Modal";

import { createAccount, deleteAccount, linkAccount, listAccounts, unlinkAccount, updateAccount } from "./api";

const TYPES: AccountType[] = ["BANK", "CASH", "E_MONEY", "CREDIT_CARD"];

const typeKey = (type: AccountType) => `account.type.${type}` as MessageKey;

function isValidOpeningBalanceInput(value: string, exponent: number): boolean {
	if (!/^\d*(?:\.\d*)?$/.test(value)) return false;
	if (!value.includes(".")) return true;
	if (exponent === 0) return false;
	return value.split(".")[1].length <= exponent;
}

export function NewAccountDialog({ ledger, onClose, onSaved }: { ledger: LedgerDetail; onClose: () => void; onSaved: () => void }) {
	const t = useT();
	const currencies = useCurrencies();
	const [name, setName] = useState("");
	const [type, setType] = useState<AccountType>("BANK");
	const [currency, setCurrency] = useState(ledger.currency);
	const [opening, setOpening] = useState("");
	const [memo, setMemo] = useState("");
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const exponent = useMinorUnitExponent(currency) ?? 0;
	const canSave = name.trim().length > 0 && name.length <= 50;

	async function save() {
		setBusy(true);
		setError(null);
		try {
			await createAccount({
				name: name.trim(),
				type,
				currency,
				ledgerIds: [ledger.id],
				openingBalanceMinor: toMinor(opening, exponent),
				memo: memo || undefined,
			});
			onSaved();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("account.new")}
				width={460}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						<Button variant="primary" onClick={save} disabled={!canSave || busy}>{busy ? t("auth.creating") : t("account.create")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 50 })}>
					<Input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("account.type")}>
					<Select value={type} onChange={(v) => setType(v as AccountType)} options={TYPES.map((value) => ({ value, label: t(typeKey(value)) }))} />
				</DialogField>
				<DialogField label={t("slip.currency")} note={t("account.currencyFixedNote")}>
					<Select value={currency} onChange={setCurrency} options={currencies.map((c) => ({ value: c.code, label: `${c.code} · ${c.nameEn}` }))} />
				</DialogField>
				<DialogField label={t("account.opening")} note={t("account.openingNote")}>
					<div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
						<Input
							value={opening}
							placeholder="0"
							align="right"
							inputMode={exponent === 0 ? "numeric" : "decimal"}
							onChange={(e) => {
								if (isValidOpeningBalanceInput(e.target.value, exponent)) setOpening(e.target.value);
							}}
							style={{ flex: 1 }}
						/>
						<span style={{ font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", color: "var(--text-secondary)" }}>{currency}</span>
					</div>
				</DialogField>
				<DialogField label={t("account.memo")}>
					<Input value={memo} maxLength={200} placeholder={t("common.optional")} onChange={(e) => setMemo(e.target.value)} />
				</DialogField>
				<div style={{ marginTop: "var(--space-7)", paddingTop: "var(--space-6)", borderTop: "var(--rule-section)", font: "var(--type-prose)", color: "var(--text-secondary)" }}>
					{t("account.createdLinked", { ledger: ledger.name })}
				</div>
			</Modal>
	);
}

export function EditAccountDialog({ account, onClose, onSaved }: { account: AccountDetail; onClose: () => void; onSaved: () => void }) {
	const t = useT();
	const [name, setName] = useState(account.name);
	const [archived, setArchived] = useState(account.archived);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	async function save() {
		setBusy(true);
		setError(null);
		try {
			await updateAccount(account.id, {
				name: name.trim(),
				archived,
				version: account.version,
			});
			onSaved();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	async function remove() {
		setBusy(true);
		setError(null);
		try {
			await deleteAccount(account.id);
			onSaved();
		} catch (err) {

			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("account.edit")}
				width={460}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						{confirmDelete ? (
							<Button variant="danger" onClick={remove} disabled={busy}>{t("common.reallyDelete")}</Button>
						) : (
							<Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>{t("common.delete")}</Button>
						)}
						<Button variant="primary" onClick={save} disabled={!name.trim() || busy}>{t("common.saveChanges")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 50 })}>
					<Input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("account.type")}>
					<Input value={t(typeKey(account.type))} disabled readOnly />
				</DialogField>
				<DialogField label={t("slip.currency")} note={t("account.currencyFixed")}>
					<Input value={account.currency} disabled readOnly />
				</DialogField>
				<div style={{ marginTop: "var(--space-7)", paddingTop: "var(--space-6)", borderTop: "var(--rule-section)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
					<Checkbox checked={archived} onChange={setArchived} label={t("account.archived")} />
				</div>
				{confirmDelete ? (
					<div style={{ marginTop: "var(--space-6)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
						{t("account.deleteWarning")}
					</div>
				) : null}
			</Modal>
	);
}

export function AccountLinksDialog({
	ledger,
	onClose,
	onSaved,
}: {
	ledger: LedgerDetail;
	onClose: () => void;
	onSaved: () => void;
}) {
	const t = useT();
	const [ownedAccounts, setOwnedAccounts] = useState<AccountDetail[]>([]);
	const [ledgerAccounts, setLedgerAccounts] = useState<AccountDetail[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [error, setError] = useState<unknown>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.all([listAccounts(undefined, true), listAccounts(ledger.id, true)])
			.then(([accounts, linked]) => {
				if (cancelled) return;
				const ownedIds = new Set(accounts.map((account) => account.id));
				setOwnedAccounts(accounts);
				setLedgerAccounts(linked);
				setSelected(new Set(linked.filter((account) => ownedIds.has(account.id)).map((account) => account.id)));
			})
			.catch((err) => !cancelled && setError(err))
			.finally(() => !cancelled && setLoading(false));
		return () => { cancelled = true; };
	}, [ledger.id]);

	const initiallyLinked = new Set(ledgerAccounts.map((account) => account.id));
	const connected = ownedAccounts.filter((account) => initiallyLinked.has(account.id));
	const available = ownedAccounts.filter((account) => !initiallyLinked.has(account.id) && !account.archived);

	function toggle(id: string, checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}

	async function save() {
		setBusy(true);
		setError(null);
		try {
			const ownedIds = new Set(ownedAccounts.map((account) => account.id));
			const before = new Set(ledgerAccounts.filter((account) => ownedIds.has(account.id)).map((account) => account.id));
			await Promise.all([
				...Array.from(selected).filter((id) => !before.has(id)).map((id) => linkAccount(id, ledger.id)),
				...Array.from(before).filter((id) => !selected.has(id)).map((id) => unlinkAccount(id, ledger.id)),
			]);
			onSaved();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	function group(label: string, accounts: AccountDetail[], empty: string) {
		return (
			<section style={{ paddingTop: "var(--space-6)", borderTop: "var(--rule-row)" }}>
				<div style={{ marginBottom: "var(--space-4)", font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>{label}</div>
				{accounts.length ? accounts.map((account) => (
					<div key={account.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-3) 0" }}>
						<Checkbox checked={selected.has(account.id)} onChange={(checked) => toggle(account.id, checked)} label={account.archived ? `${account.name} · ${t("accounts.archived")}` : account.name} />
						<span style={{ marginLeft: "auto", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{account.currency}</span>
					</div>
				)) : <p style={{ margin: 0, font: "var(--type-prose)", color: "var(--text-tertiary)" }}>{empty}</p>}
			</section>
		);
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("account.manageLinks")}
				width={500}
				footer={(
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						<Button variant="primary" onClick={save} disabled={loading || busy}>{t("common.saveChanges")}</Button>
					</>
				)}
			>
				<DialogError error={error} />
				<p style={{ margin: "0 0 var(--space-6)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
					{t("account.linksNote", { ledger: ledger.name })}
				</p>
				{loading ? <p style={{ font: "var(--type-prose)", color: "var(--text-tertiary)" }}>{t("inspector.loading")}</p> : (
					<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}>
						{group(t("account.linked"), connected, t("account.noLinkedOwned"))}
						{group(t("account.available"), available, t("account.noAvailable"))}
					</div>
				)}
			</Modal>
	);
}
