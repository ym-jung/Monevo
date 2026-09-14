"use client";

import { useEffect, useState } from "react";

import { Avatar, Badge, Button, Input, ListRow, Select } from "@/ds";
import type { LedgerDetail, LedgerInviteResponse, LedgerMemberDetail } from "@/lib/api/types";

import { useT } from "@/lib/i18n/provider";

import { DialogError } from "@/features/common/DialogForm";
import { Modal } from "@/features/common/Modal";

import { acceptInvite, createInvite, listInvites, listMembers, removeMember, revokeInvite } from "./api";

const EXPIRY_DAYS = [1, 3, 7, 14, 30];
const USE_COUNTS = [1, 2, 5, 10];

const LABEL: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	color: "var(--text-tertiary)",
};

export function MembersDialog({ ledger, viewerId, onClose, onChanged }: { ledger: LedgerDetail; viewerId: string; onClose: () => void; onChanged: () => void }) {
	const t = useT();
	const [members, setMembers] = useState<LedgerMemberDetail[]>([]);
	const [invites, setInvites] = useState<LedgerInviteResponse[]>([]);
	const [expiresInDays, setExpiresInDays] = useState("7");
	const [maxUses, setMaxUses] = useState("1");
	const [confirming, setConfirming] = useState<string | null>(null);
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	const isOwner = ledger.myRole === "OWNER";

	async function refresh() {
		setError(null);
		try {
			const [m, i] = await Promise.all([
				listMembers(ledger.id),

				isOwner ? listInvites(ledger.id) : Promise.resolve([]),
			]);
			setMembers(m);
			setInvites(i);
		} catch (err) {
			setError(err);
		}
	}

	useEffect(() => {
		void refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ledger.id]);

	async function issue() {
		setBusy(true);
		setError(null);
		try {
			await createInvite(ledger.id, { expiresInDays: Number(expiresInDays), maxUses: Number(maxUses) });
			await refresh();
		} catch (err) {
			setError(err);
		} finally {
			setBusy(false);
		}
	}

	async function revoke(inviteId: string) {
		setBusy(true);
		try {
			await revokeInvite(ledger.id, inviteId);
			await refresh();
		} catch (err) {
			setError(err);
		} finally {
			setBusy(false);
		}
	}

	async function leaveOrEvict(userId: string) {
		setBusy(true);
		setError(null);
		try {
			await removeMember(ledger.id, userId);
			onChanged();
		} catch (err) {
			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal onDismiss={onClose} title={t("members.title")} width={470} footer={<Button onClick={onClose}>{t("common.close")}</Button>}>
				<DialogError error={error} />

				<div style={LABEL}>{t("members.inThisLedger")}</div>
				<div style={{ margin: "var(--space-5) 0 var(--space-10)" }}>
					{members.map((member) => {
						const isSelf = member.userId === viewerId;
						const isMemberOwner = member.role === "OWNER";

						const action = isMemberOwner ? null : isSelf ? "leave" : isOwner ? "remove" : null;
						return (
							<ListRow key={member.id}>
								<Avatar name={member.displayName} size={20} />
								<span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
									{member.displayName}{isSelf ? ` · ${t("members.you")}` : null}
								</span>
								<Badge tone={isMemberOwner ? "info" : "neutral"}>{member.role}</Badge>
								{action ? (
									confirming === member.userId ? (
										<Button size="sm" variant="danger" disabled={busy} onClick={() => leaveOrEvict(member.userId)}>
											{action === "leave" ? t("members.reallyLeave") : t("members.reallyRemove")}
										</Button>
									) : (
										<Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(member.userId)}>
											{action === "leave" ? t("members.leave") : t("members.remove")}
										</Button>
									)
								) : null}
							</ListRow>
						);
					})}
				</div>

				{isOwner ? (
					<>
						<div style={LABEL}>{t("members.inviteCodes")}</div>
						<div style={{ margin: "var(--space-5) 0 var(--space-6)" }}>
							{invites.length === 0 ? (
								<div style={{ font: "var(--type-prose)", color: "var(--text-secondary)" }}>{t("members.noInvites")}</div>
							) : (
								invites.map((invite) => (
									<ListRow key={invite.id}>
										<span style={{ font: "var(--type-money)", letterSpacing: "var(--tracking-label)", border: "var(--hairline) solid var(--border-control)", padding: "var(--space-2) var(--space-5)" }}>
											{invite.code}
										</span>
										<span style={{ flex: 1, minWidth: 0, ...LABEL, letterSpacing: "var(--tracking-label)" }}>
											{t("members.inviteUsed", { used: invite.usedCount, max: invite.maxUses, date: invite.expiresAt.slice(0, 10) })}
										</span>
										<Button size="sm" variant="ghost" disabled={busy} onClick={() => revoke(invite.id)}>{t("members.revoke")}</Button>
									</ListRow>
								))
							)}
						</div>

						<div style={{ display: "flex", gap: "var(--space-5)", alignItems: "center", paddingTop: "var(--space-6)", borderTop: "var(--rule-section)" }}>
							<Select
								value={expiresInDays}
								onChange={setExpiresInDays}
								options={EXPIRY_DAYS.map((d) => ({ value: String(d), label: t("members.days", { count: d }) }))}
								style={{ flex: 1 }}
							/>
							<Select
								value={maxUses}
								onChange={setMaxUses}
								options={USE_COUNTS.map((n) => ({ value: String(n), label: n === 1 ? t("members.oneUse") : t("members.uses", { count: n }) }))}
								style={{ flex: 1 }}
							/>
							<Button variant="primary" icon="link" disabled={busy} onClick={issue}>{t("members.issue")}</Button>
						</div>
					</>
				) : null}
			</Modal>
	);
}

export function JoinLedgerDialog({ onClose, onJoined }: { onClose: () => void; onJoined: (ledgerId: string) => void }) {
	const t = useT();
	const [code, setCode] = useState("");
	const [error, setError] = useState<unknown>(null);
	const [busy, setBusy] = useState(false);

	async function join() {
		setBusy(true);
		setError(null);
		try {
			const joined = await acceptInvite(code);
			onJoined(joined.ledgerId);
		} catch (err) {

			setError(err);
			setBusy(false);
		}
	}

	return (
		<Modal
				onDismiss={onClose}
				title={t("join.title")}
				width={420}
				message={t("join.message")}
				footer={
					<>
						<Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
						<Button variant="primary" onClick={join} disabled={code.trim().length !== 8 || busy}>{busy ? t("join.joining") : t("join.submit")}</Button>
					</>
				}
			>
				<DialogError error={error} />
				<Input
					value={code}
					maxLength={8}
					align="center"
					size="lg"
					placeholder="XXXXXXXX"
					onChange={(e) => setCode(e.target.value.toUpperCase())}
					style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.35em" }}
				/>
				<div style={{ marginTop: "var(--space-6)", ...LABEL, letterSpacing: "var(--tracking-label)", textAlign: "center" }}>
					{t("join.alphabet")}
				</div>
			</Modal>
	);
}
