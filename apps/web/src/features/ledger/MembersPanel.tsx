"use client";

import { useState } from "react";

import { Avatar, Button } from "@/ds";
import { ApiError } from "@/lib/api/errors";
import type { LedgerDetail } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";

import { removeMember, revokeInvite } from "./api";

import { EYEBROW, ROW, SheetHeader, useSheetStyle } from "./panelChrome";
import { useLedgerMembers } from "./useLedgerMembers";

export function MembersPanel({ ledger, viewerId, onLeft }: { ledger: LedgerDetail; viewerId: string; onLeft: () => void }) {
	const sheet = useSheetStyle();
	const t = useT();
	const { members, invites, error, busy, isOwner, refresh, run } = useLedgerMembers(ledger);
	const [confirming, setConfirming] = useState<string | null>(null);

	async function remove(userId: string) {
		await run(async () => {
			await removeMember(ledger.id, userId);
			if (userId === viewerId) onLeft();
			else await refresh();
		});
	}

	return (
		<section style={sheet}>
			<SheetHeader label={t("members.andInvites")} />
			{error ? (
				<div role="alert" style={{ padding: "var(--space-6) 0", font: "var(--type-prose)", color: "var(--status-danger)" }}>
					{error instanceof ApiError ? error.message : t("common.genericError")}
				</div>
			) : null}

			{members.map((member) => {
				const mine = member.userId === viewerId;

				const action = member.role === "OWNER" ? null : mine ? "leave" : isOwner ? "remove" : null;
				return (
					<article key={member.id} style={ROW}>
						<Avatar name={member.displayName} size={20} />
						<span style={{ flex: 1, minWidth: 0 }}>
							<b style={{ display: "block", font: "var(--type-body)" }}>{member.displayName}{mine ? ` · ${t("members.you")}` : null}</b>
							<small style={{ ...EYEBROW, letterSpacing: "var(--tracking-label)" }}>{member.role} · {member.joinedAt.slice(0, 10)}</small>
						</span>
						{action ? (
							confirming === member.userId ? (
								<Button size="sm" variant="danger" disabled={busy} onClick={() => remove(member.userId)}>
									{action === "leave" ? t("members.reallyLeave") : t("members.reallyRemove")}
								</Button>
							) : (
								<Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(member.userId)}>
									{action === "leave" ? t("members.leave") : t("members.remove")}
								</Button>
							)
						) : null}
					</article>
				);
			})}

			{invites.map((invite) => (
				<article key={invite.id} style={ROW}>
					<code style={{ font: "var(--type-money)", letterSpacing: "var(--tracking-label)", border: "var(--hairline) solid var(--border-control)", padding: "var(--space-2) var(--space-5)" }}>
						{invite.code}
					</code>
					<span style={{ flex: 1, minWidth: 0, ...EYEBROW, letterSpacing: "var(--tracking-label)" }}>
						{t("members.inviteUsed", { used: invite.usedCount, max: invite.maxUses, date: invite.expiresAt.slice(0, 10) })}
					</span>
					<Button
						size="sm"
						variant="ghost"
						disabled={busy}
						onClick={() => run(async () => {
							await revokeInvite(ledger.id, invite.id);
							await refresh();
						})}
					>
						{t("members.revoke")}
					</Button>
				</article>
			))}
		</section>
	);
}
