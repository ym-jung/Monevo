"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge, Button } from "@/ds";
import { endBrowserSession } from "@/lib/amplify/browserSession.client";
import type { UserStatus } from "@/lib/api/types";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/provider";

import { LABEL, RULE, Slip, TIGHT_LABEL } from "./Slip";

type GateStatus = Exclude<UserStatus, "ACTIVE">;

const TONE: Record<GateStatus, "warning" | "danger" | "neutral"> = {
	PENDING: "warning",
	REJECTED: "danger",
	SUSPENDED: "danger",
	DELETED: "neutral",
};

const COPY_KEY: Record<GateStatus, string> = {
	PENDING: "pending",
	REJECTED: "rejected",
	SUSPENDED: "suspended",
	DELETED: "deleted",
};

export function Gate({ status, email }: { status: GateStatus; email: string }) {
	const t = useT();
	const router = useRouter();
	const key = COPY_KEY[status];

	async function leave() {
		await endBrowserSession().catch(() => {});
		router.replace("/sign-in");
		router.refresh();
	}

	return (
		<Slip
			width={420}
			footer={<Button variant="ghost" size="sm" onClick={leave}>{t("auth.signOut")}</Button>}
		>
			<div style={{ textAlign: "center", paddingBottom: "var(--space-8)", borderBottom: "var(--rule-total)" }}>
				<Badge tone={TONE[status]}>{t(`gate.${key}.stamp` as MessageKey)}</Badge>
			</div>
			<div style={{ padding: "var(--space-8) 0 0" }}>
				<div style={{ font: "var(--type-title-3)", letterSpacing: "var(--tracking-normal)", textTransform: "uppercase", color: "var(--text-primary)" }}>{t(`gate.${key}.title` as MessageKey)}</div>
				<div style={{ marginTop: "var(--space-5)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>{t(`gate.${key}.body` as MessageKey)}</div>
				<div style={{ ...RULE, marginTop: "var(--space-8)", paddingTop: "var(--space-6)", display: "flex", justifyContent: "space-between", gap: "var(--space-5)", ...LABEL, letterSpacing: "var(--tracking-label)" }}>
					<span>{t("gate.signedInAs")}</span>
					<span style={{ color: "var(--text-primary)" }}>{email}</span>
				</div>
				{status === "PENDING" ? (
					<div style={{ marginTop: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
						<Link href="/profile"><Button size="lg" icon="user" fullWidth>{t("gate.editProfile")}</Button></Link>
						<span style={{ ...TIGHT_LABEL, textAlign: "center" }}>{t("gate.pending.note")}</span>
					</div>
				) : null}
			</div>
		</Slip>
	);
}
