"use client";

import { Button } from "@/ds";

import { DialogError } from "./DialogForm";
import { Modal } from "./Modal";

export function ConfirmDialog({
	title,
	message,
	cancelLabel,
	actionLabel,
	busyLabel,
	busy,
	error,
	onCancel,
	onConfirm,
}: {
	title: string;
	message: string;
	cancelLabel: string;
	actionLabel: string;
	busyLabel: string;
	busy: boolean;
	error: unknown;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (

		<Modal
			onDismiss={() => { if (!busy) onCancel(); }}
			title={title}
			width={420}
			footer={
				<>
					<Button onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
					<Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? busyLabel : actionLabel}</Button>
				</>
			}
		>
			<DialogError error={error} />
			<div style={{ font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>{message}</div>
		</Modal>
	);
}
