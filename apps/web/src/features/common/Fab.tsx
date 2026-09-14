"use client";

import { useCallback, useRef, useState } from "react";

import { Icon } from "@/ds";

export const FAB_STACK: React.CSSProperties = {
	position: "fixed",
	right: "var(--space-12)",
	bottom: "var(--space-12)",
	zIndex: 30,
	display: "flex",

	flexDirection: "column",
	alignItems: "center",
	gap: "var(--space-5)",
};

export const PHONE_FAB_STACK: React.CSSProperties = {
	position: "fixed",
	right: "var(--space-6)",
	bottom: "calc(var(--tabbar-height) + var(--safe-bottom) + var(--space-6))",
	zIndex: 30,
	display: "flex",
};

export const FAB_BASE: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: "var(--fab-size-sm)",
	height: "var(--fab-size-sm)",
	flex: "0 0 auto",
	border: "var(--hairline) solid var(--border-strong)",
	background: "var(--surface-paper)",
	color: "var(--text-primary)",

	borderRadius: "var(--radius-full)",
	boxShadow: "var(--shadow-paper)",
	cursor: "pointer",
	textDecoration: "none",
};

const PRIMARY: React.CSSProperties = {
	width: "var(--fab-size)",
	height: "var(--fab-size)",
	background: "var(--fab-primary-bg)",
	color: "var(--paper-1)",
	border: "none",
};

export function useFire() {
	const [firing, setFiring] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fire = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		setFiring(true);
		timer.current = setTimeout(() => setFiring(false), 260);
	}, []);
	return [firing, fire] as const;
}

export function Fab({ icon, label, primary = false, disabled = false, onClick }: {
	icon: string;
	label: string;
	primary?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	const [firing, fire] = useFire();
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={() => { fire(); onClick(); }}
			className={`ds-focusable ds-fab${firing ? " is-firing" : ""}`}
			style={{
				...FAB_BASE,
				...(primary ? PRIMARY : null),
				opacity: disabled ? 0.4 : 1,
				cursor: disabled ? "not-allowed" : "pointer",
			}}
		>
			<Icon name={icon} size={primary ? 18 : 15} />
		</button>
	);
}

export function PhoneFab({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
	const [firing, fire] = useFire();
	return (
		<button
			type="button"
			aria-label={label}
			onClick={() => { fire(); onClick(); }}
			className={`ds-focusable ds-fab${firing ? " is-firing" : ""}`}
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: "var(--fab-size)",
				height: "var(--fab-size)",
				border: "none",
				borderRadius: "var(--radius-box)",
				background: "var(--ink-1)",
				color: "var(--paper-1)",
				boxShadow: "var(--shadow-popover)",
				cursor: "pointer",
			}}
		>
			<Icon name={icon} size={20} />
		</button>
	);
}

export function FabLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			aria-label={label}
			title={label}
			className="ds-focusable ds-fab"
			style={{ ...FAB_BASE, background: "var(--ink-1)", border: "none", padding: 0, overflow: "hidden" }}
		>
			{children}
		</a>
	);
}
