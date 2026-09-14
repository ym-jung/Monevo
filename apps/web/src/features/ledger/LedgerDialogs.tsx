"use client";

import { useState } from "react";

import { Button, Checkbox, Input, Select } from "@/ds";
import type { LedgerDetail } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { useCurrencies } from "@/lib/money/currency";

import { DialogError, DialogField } from "@/features/common/DialogForm";
import { Modal } from "@/features/common/Modal";

import { TIMEZONES } from "@/features/auth/options";

import { createLedger, deleteLedger, updateLedger } from "./api";

export function NewLedgerDialog({
	onClose,
	onSaved,
	initialCurrency = "JPY",
	initialTimezone = "Asia/Tokyo",
}: {
	onClose: () => void;
	onSaved: (ledger: LedgerDetail) => void;
	initialCurrency?: string;
	initialTimezone?: string;
}) {
	const t = useT();
	const currencies = useCurrencies();
	const [name, setName] = useState("");
	const [currency, setCurrency] = useState(initialCurrency);
	const [timezone, setTimezone] = useState(TIMEZONES.includes(initialTimezone) ? initialTimezone : "Asia/Tokyo");
	const [confirmed, setConfirmed] = useState(false);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const canSave = name.trim().length > 0 && name.length <= 100 && confirmed;

	async function save() {
		setBusy(true);
		setError(null);
		try {
			onSaved(await createLedger({ name: name.trim(), currency, timezone, confirmCurrencyIrreversible: true }));
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("ledger.new")}
				width={460}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						<Button variant="primary" onClick={save} disabled={!canSave || busy}>{busy ? t("auth.creating") : t("ledger.create")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 100 })}>
					<Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("slip.currency")} note={t("ledger.currencyNote")}>
					<Select value={currency} onChange={setCurrency} options={currencies.map((c) => ({ value: c.code, label: `${c.code} · ${c.nameEn}` }))} />
				</DialogField>
				<DialogField label={t("profile.timezone")} note={t("ledger.timezoneNote")}>
					<Select value={timezone} onChange={setTimezone} options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))} />
				</DialogField>
				<div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "var(--rule-section)" }}>
					<Checkbox
						checked={confirmed}
						onChange={setConfirmed}
						label={t("ledger.irreversible")}
					/>
				</div>
			</Modal>
	);
}

export function EditLedgerDialog({
	ledger,
	onClose,
	onSaved,
	onDeleted,
}: {
	ledger: LedgerDetail;
	onClose: () => void;
	onSaved: () => void;
	onDeleted: () => void;
}) {
	const t = useT();
	const [name, setName] = useState(ledger.name);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const isOwner = ledger.myRole === "OWNER";

	async function save() {
		setBusy(true);
		setError(null);
		try {

			await updateLedger(ledger.id, { name: name.trim(), version: ledger.version });
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
			await deleteLedger(ledger.id);
			onDeleted();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("ledger.edit")}
				width={460}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						{isOwner ? (
							confirmDelete ? (
								<Button variant="danger" onClick={remove} disabled={busy}>{t("common.reallyDelete")}</Button>
							) : (
								<Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>{t("common.delete")}</Button>
							)
						) : null}
						<Button variant="primary" onClick={save} disabled={!name.trim() || busy}>{t("common.saveChanges")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				{confirmDelete ? (
					<div style={{ marginBottom: "var(--space-7)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
						{t("ledger.deleteWarning")}
					</div>
				) : null}
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 100 })}>
					<Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("slip.currency")} note={t("ledger.currencyFixed")}>
					<Input value={ledger.currency} disabled readOnly />
				</DialogField>
			</Modal>
	);
}
