"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/ds";
import { usePhone } from "@/lib/viewport/provider";

import { Sheet, useDismissOnEscape } from "./Sheet";

const FLATTENED: React.CSSProperties = {
	position: "relative",
	inset: "auto",
	display: "block",
	background: "transparent",
	padding: 0,
	overflowY: "visible",
	width: "100%",
};

export interface ModalProps {
	title?: string;
	message?: string;

	width?: number;
	footer?: ReactNode;
	onDismiss: () => void;
	children?: ReactNode;
}

export function Modal({ title, message, width = 460, footer, onDismiss, children }: ModalProps) {
	const phone = usePhone();
	useDismissOnEscape(onDismiss);

	if (phone) {
		return (
			<Sheet title={title} onDismiss={onDismiss} footer={footer ? <div className="ds-sheet-actions">{footer}</div> : undefined}>
				{message ? (
					<p style={{ margin: "0 0 var(--space-8)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>{message}</p>
				) : null}
				{children}
			</Sheet>
		);
	}

	return (
		<div
			onClick={onDismiss}
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 50,
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",

				padding: "9dvh var(--space-8) var(--space-8)",
				overflowY: "auto",
				background: "var(--scrim)",
			}}
		>
			<div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: `${width / 16}rem` }}>
				<Dialog title={title} message={message} width={width} footer={footer} style={FLATTENED}>
					{children}
				</Dialog>
			</div>
		</div>
	);
}
