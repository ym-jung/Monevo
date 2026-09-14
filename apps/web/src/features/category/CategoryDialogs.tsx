"use client";

import { useState } from "react";

import { Button, Input, SegmentedControl, Select } from "@/ds";
import type { CategoryKind, CategoryNode, LedgerDetail } from "@/lib/api/types";

import { useT } from "@/lib/i18n/provider";

import { DialogError, DialogField } from "@/features/common/DialogForm";
import { Modal } from "@/features/common/Modal";

import { createCategory, deleteCategory, updateCategory } from "./api";

export function NewCategoryDialog({ ledger, categories, onClose, onSaved }: { ledger: LedgerDetail; categories: CategoryNode[]; onClose: () => void; onSaved: () => void }) {
	const t = useT();
	const [name, setName] = useState("");
	const [kind, setKind] = useState<CategoryKind>("EXPENSE");
	const [parentId, setParentId] = useState("");
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const parents = categories.filter((c) => c.kind === kind);
	const canSave = name.trim().length > 0 && name.length <= 40;

	async function save() {
		setBusy(true);
		setError(null);
		try {
			await createCategory(ledger.id, { name: name.trim(), kind, parentId: parentId || undefined });
			onSaved();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("category.new")}
				width={440}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						<Button variant="primary" onClick={save} disabled={!canSave || busy}>{busy ? t("auth.creating") : t("category.create")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				<div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-10)" }}>
					<SegmentedControl
						value={kind}
						onChange={(v: string) => {
							setKind(v as CategoryKind);

							setParentId("");
						}}
						options={[
							{ value: "EXPENSE", label: t("kind.expense") },
							{ value: "INCOME", label: t("kind.income") },
						]}
					/>
				</div>
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 40 })}>
					<Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("category.under")} note={t("category.underNote")}>
					<Select
						value={parentId}
						onChange={setParentId}
						options={[{ value: "", label: t("category.topLevel") }, ...parents.map((c) => ({ value: c.id, label: c.name }))]}
					/>
				</DialogField>
				<div style={{ marginTop: "var(--space-6)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
					{t("category.leafNote")}
				</div>
			</Modal>
	);
}

export function EditCategoryDialog({ category, onClose, onSaved }: { category: CategoryNode; onClose: () => void; onSaved: () => void }) {
	const t = useT();
	const [name, setName] = useState(category.name);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	async function save() {
		setBusy(true);
		setError(null);
		try {

			await updateCategory(category.id, { name: name.trim() });
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
			await deleteCategory(category.id);
			onSaved();
		} catch (err) {

			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("category.edit")}
				width={440}
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
				<DialogField label={t("ledger.name")} note={t("common.count", { n: name.length, max: 40 })}>
					<Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
				</DialogField>
				<DialogField label={t("category.kind")} note={t("category.kindFixed")}>
					<Input value={t(category.kind === "INCOME" ? "kind.income" : "kind.expense")} disabled readOnly />
				</DialogField>
			</Modal>
	);
}
