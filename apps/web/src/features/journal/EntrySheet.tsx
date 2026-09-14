"use client";

import { useMemo, useRef, useState } from "react";

import { Button, IconButton, Input, Select, SegmentedControl } from "@/ds";
import type {
	AccountDetail, CategoryNode, JournalEntryDetail, JournalEntryKind, LedgerDetail,
} from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { useMinorUnitExponent } from "@/lib/money/currency";

import { flattenCategories } from "@/features/category/api";
import { ConfirmDialog } from "@/features/common/ConfirmDialog";
import { DialogError, DialogField, fromMinor, toMinor } from "@/features/common/DialogForm";
import { Modal } from "@/features/common/Modal";

import { createEntry, deleteEntry, updateEntry } from "./api";
import { buildEntryLines, canSaveEntry, type EntryDraft } from "./entryLines";

interface Split {
	key: string;
	categoryId: string;

	amount: string;
	memo: string;
}

const MAX_SPLITS = 190;

export interface EntrySheetProps {
	ledger: LedgerDetail;
	accounts: AccountDetail[];
	categories: CategoryNode[];

	entry?: JournalEntryDetail;
	onClose: () => void;
	onSaved: () => void;
}

function kindOf(entry: JournalEntryDetail | undefined): JournalEntryKind {
	if (!entry) return "EXPENSE";
	return entry.kind === "SPLIT" || entry.kind === "OPENING" ? "EXPENSE" : entry.kind;
}

export function EntrySheet({ ledger, accounts, categories, entry, onClose, onSaved }: EntrySheetProps) {
	const t = useT();
	const usable = accounts.filter((a) => !a.archived);
	const submitting = useRef(false);

	const kinds: { value: JournalEntryKind; label: string }[] = [
		{ value: "EXPENSE", label: t("kind.expense") },
		{ value: "INCOME", label: t("kind.income") },
		{ value: "TRANSFER", label: t("kind.transfer") },
	];

	const existing = useMemo(() => {
		if (!entry) return null;
		const kind = kindOf(entry);
		const moneySide = kind === "INCOME" ? "DEBIT" : "CREDIT";
		const money = entry.lines.find((l) => l.side === moneySide && l.account.subtype === "REAL");
		const others = entry.lines.filter((l) => l.id !== money?.id);
		return { kind, money, others };
	}, [entry]);

	const [clientRequestId] = useState(() => crypto.randomUUID());
	const [kind, setKind] = useState<JournalEntryKind>(kindOf(entry));
	const [description, setDescription] = useState(entry?.description ?? "");
	const [accountId, setAccountId] = useState(existing?.money?.account.id ?? usable[0]?.id ?? "");
	const [counterAccountId, setCounterAccountId] = useState(
		existing?.kind === "TRANSFER" ? (existing.others[0]?.account.id ?? "") : "",
	);
	const [date, setDate] = useState(entry?.entryDate ?? new Date().toISOString().slice(0, 10));
	const [memo, setMemo] = useState(entry?.memo ?? "");
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const account = usable.find((a) => a.id === accountId) ?? usable[0];
	const currency = account?.currency ?? ledger.currency;
	const exponent = useMinorUnitExponent(currency) ?? 0;

	const counterAccount = usable.find((a) => a.id === counterAccountId);
	const counterCurrency = counterAccount?.currency ?? currency;
	const counterExponent = useMinorUnitExponent(counterCurrency) ?? 0;
	const exchange = kind === "TRANSFER" && counterCurrency !== currency;

	const leaves = useMemo(
		() =>
			flattenCategories(categories).filter(
				(c) => c.children.length === 0 && c.kind === (kind === "INCOME" ? "INCOME" : "EXPENSE"),
			),
		[categories, kind],
	);

	const [splits, setSplits] = useState<Split[]>(() => {
		const rows = existing && existing.kind !== "TRANSFER" ? existing.others : [];
		if (!rows.length) return [{ key: crypto.randomUUID(), categoryId: "", amount: "", memo: "" }];
		return rows.map((line) => ({
			key: line.id,
			categoryId: line.account.id,
			amount: fromMinor(line.amountMinor, exponent),
			memo: line.memo ?? "",
		}));
	});

	const [counterAmount, setCounterAmount] = useState(
		existing?.kind === "TRANSFER" && existing.others[0]
			? fromMinor(existing.others[0].amountMinor, counterExponent)
			: "",
	);

	const [amount, setAmount] = useState(
		existing?.money ? fromMinor(existing.money.amountMinor, exponent) : "",
	);

	const transfer = kind === "TRANSFER";
	const splitAmounts = splits.map((s) => toMinor(s.amount, exponent));
	const splitTotal = splitAmounts.reduce((sum, n) => sum + n, 0);
	const single = splits.length === 1;
	const amountMinor = transfer ? toMinor(amount, exponent) : splitTotal;
	const counterMinor = toMinor(counterAmount, counterExponent);

	const usableCounters = usable.filter((a) => a.id !== accountId);

	const draft: EntryDraft = {
		kind,
		description,
		date,
		accountId,
		counterAccountId,
		availableCounterIds: usableCounters.map((a) => a.id),
		availableCategoryIds: leaves.map((c) => c.id),
		amountMinor,
		counterMinor,
		exchange,
		splits: splits.map((split, index) => ({
			categoryId: split.categoryId,
			amountMinor: splitAmounts[index],
			memo: split.memo,
		})),
	};

	const canSave = canSaveEntry(draft);

	function addSplit() {
		setSplits((prev) => {
			if (prev.length >= MAX_SPLITS) {
				return prev;
			}
			const seeded = prev.length === 1 && !prev[0].amount ? [{ ...prev[0], amount }] : prev;
			return [...seeded, { key: crypto.randomUUID(), categoryId: "", amount: "", memo: "" }];
		});
	}

	function removeSplit(key: string) {
		setSplits((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
	}

	function patchSplit(key: string, patch: Partial<Split>) {
		setSplits((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
	}


	async function save() {
		if (submitting.current) return;
		submitting.current = true;
		setBusy(true);
		setError(null);
		try {
			if (entry) {
				await updateEntry(entry.id, {
					entryDate: date,
					description: description.trim(),
					memo: memo || undefined,
					lines: buildEntryLines(draft),

					version: entry.version,
				});
			} else {
				await createEntry({
					clientRequestId,
					ledgerId: ledger.id,
					entryDate: date,
					description: description.trim(),
					memo: memo || undefined,
					lines: buildEntryLines(draft),

				});
			}
			onSaved();
		} catch (err) {
			setError(err);
			submitting.current = false;
			setBusy(false);
		}
	}

	async function remove() {
		if (submitting.current) return;
		submitting.current = true;
		setBusy(true);
		setError(null);
		try {
			await deleteEntry(entry!.id);
			onSaved();
		} catch (err) {
			setError(err);
			submitting.current = false;
			setBusy(false);
		}
	}

	function openDeleteConfirmation() {
		setError(null);
		setConfirmDelete(true);
	}

	function closeDeleteConfirmation() {
		setError(null);
		setConfirmDelete(false);
	}

	if (entry && confirmDelete) {
		return (
			<ConfirmDialog
				title={t("entry.deleteTitle")}
				message={t("entry.deleteMessage", { description: entry.description })}
				cancelLabel={t("common.cancel")}
				actionLabel={t("entry.deleteAction")}
				busyLabel={t("entry.deleting")}
				busy={busy}
				error={error}
				onCancel={closeDeleteConfirmation}
				onConfirm={remove}
			/>
		);
	}

	return (
		<Modal
			onDismiss={onClose}
			title={entry ? t("entry.edit") : t("entry.new")}
			width={470}
			footer={
				<>
					<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
					{entry ? <Button variant="danger" onClick={openDeleteConfirmation} disabled={busy}>{t("common.delete")}</Button> : null}
					<Button variant="primary" onClick={save} disabled={!canSave || busy}>
						{busy ? t("common.saving") : entry ? t("common.saveChanges") : t("entry.record")}
					</Button>
				</>
			}
		>
			<DialogError error={error} />

			{entry ? null : (
				<div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-10)" }}>
					<SegmentedControl
						options={kinds}
						value={kind}
						onChange={(v: string) => {
							setKind(v as JournalEntryKind);
							setSplits([{ key: crypto.randomUUID(), categoryId: "", amount: "", memo: "" }]);
						}}
					/>
					</div>
			)}

			<DialogField label={t("slip.date")} note={t("entry.dateNote")}>
				<Input value={date} placeholder="YYYY-MM-DD" onChange={(e) => setDate(e.target.value)} invalid={!/^\d{4}-\d{2}-\d{2}$/.test(date)} />
			</DialogField>

			<DialogField label={t("slip.particulars")}>
				<Input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
			</DialogField>

			<DialogField label={t("slip.account")} note={t("entry.accountNote")}>
				<Select
					value={accountId}
					onChange={setAccountId}
					options={usable.map((a) => ({
						value: a.id,
						label: `${a.name} · ${a.currency}${a.type === "CREDIT_CARD" ? ` · ${t("entry.card")}` : ""}`,
					}))}
				/>
			</DialogField>

			{transfer ? (
				<DialogField
					label={t("slip.amount")}
					note={currency === ledger.currency ? undefined : t("entry.convertedNote", {
						currency,
						base: ledger.currency
					})}
				>
					<AmountInput value={amount} currency={currency} onChange={setAmount} />
				</DialogField>
			) : null}

			{transfer ? (
				<>
					<DialogField label={t("inspector.to")} note={exchange ? t("entry.exchangeNote") : t("entry.transferNote")}>
						<Select
							value={counterAccountId || usableCounters[0]?.id || ""}
							onChange={setCounterAccountId}
							disabled={!usableCounters.length}
							options={
								usableCounters.length
									? usableCounters.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` }))
									: [{ value: "", label: t("entry.noOtherAccount") }]
							}
						/>
				</DialogField>

					{exchange ? (
						<DialogField label={t("entry.receivedAmount")}>
							<AmountInput value={counterAmount} currency={counterCurrency} onChange={setCounterAmount} />
						</DialogField>
					) : null}
				</>
			) : (
				<div style={{display: "flex", flexDirection: "column"}}>
						{splits.map((split, index) => (
							<div
								key={split.key}
							style={{
											paddingTop: index === 0 ? 0 : "var(--space-5)",
											borderTop: index === 0 ? "none" : "var(--rule-row)",
							}}
				>
							<DialogField label={t("slip.amount")}>
								<div
									style={{
											display: "flex",
										alignItems: "center",
											gap: "var(--space-4)",
										minWidth: 0,
									}}
							>
										<div style={{ flex: 1, minWidth: 0 }}>
											<AmountInput
												value={split.amount}
												currency={currency}
											onChange={(v) =>
												patchSplit(split.key, {amount: v})
										}
											/>
									</div>

									<IconButton
										icon="x"
										size="sm"
										label={t("entry.removeSplit")}
										onClick={() => removeSplit(split.key)}
									/>
								</div>
							</DialogField>

							<DialogField
								label={t("entry.category")}
								note={
									index === 0 && !leaves.length
										? t(
											kind === "INCOME"
												? "entry.createIncomeCategory"
												: "entry.createExpenseCategory"
										)
										: undefined
								}
							>
								<Select
									aria-label={t("entry.category")}
									value={split.categoryId || leaves[0]?.id || ""}
									onChange={(v: string) =>
										patchSplit(split.key, {categoryId: v})
									}
									disabled={!leaves.length}
									options={
										leaves.length
											? leaves.map((c) => ({
												value: c.id,
												label: c.name,
											}))
											: [{
												value: "",
												label: t("entry.noCategories"),
											}]
									}
									/>
							</DialogField>

							<DialogField label={t("inspector.note")}>
									<Input
										value={split.memo}
										placeholder={t("entry.splitMemo")}
										maxLength={200}
									onChange={(e) =>
										patchSplit(split.key, {memo: e.target.value})
									}
									/>
							</DialogField>
							</div>
						))}

					<DialogField label="">
							<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "var(--space-5)",
							}}
				>
							<Button
								size="sm"
								icon="plus"
								onClick={addSplit}
								disabled={!leaves.length || splits.length >= MAX_SPLITS}
							>
								{t("entry.addSplit")}
							</Button>

							{single ? null : (
								<span
									style={{
										font: "var(--type-label-md)",
										letterSpacing: "var(--tracking-label)",
										color: "var(--text-secondary)",
									}}
							>
				{t("entry.splitTotal", {
					amount: fromMinor(splitTotal, exponent),
					currency,
				})}
								</span>
							)}
							</div>
				</DialogField>
					</div>
			)}

			<DialogField label={t("inspector.note")}>
				<Input value={memo} placeholder={t("common.optional")} onChange={(e) => setMemo(e.target.value)} />
			</DialogField>
		</Modal>
	);
}

function AmountInput({ value, currency, onChange }: { value: string; currency: string; onChange: (v: string) => void }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
			<Input value={value} placeholder="0" align="right" inputMode="decimal" onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
			<span style={{
				font: "var(--type-label-md)",
				letterSpacing: "var(--tracking-label)",
				color: "var(--text-secondary)"
			}}>{currency}</span>
		</div>
	);
}
