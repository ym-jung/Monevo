"use client";

import { signIn } from "aws-amplify/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/ds";
import { listLedgers } from "@/features/ledger/api";
import { isAccountGate } from "@/lib/api/errors";
import type { UserSummary } from "@/lib/api/types";
import { endBrowserSession, startBrowserSession } from "@/lib/amplify/browserSession.client";
import { useT } from "@/lib/i18n/provider";

import { syncProfileAfterSignIn } from "./api";
import { cognitoMessage, isName } from "./errors";
import { Field, FormError, Slip, TIGHT_LABEL } from "./Slip";

async function destinationFor(user: UserSummary, next: string | null): Promise<string> {
	if (user.status !== "ACTIVE") return "/gate";
	if (next?.startsWith("/") && !next.startsWith("//")) return next;

	try {
		const ledgers = await listLedgers();
		return ledgers.length ? `/ledgers/${ledgers[0].id}` : "/ledgers/new";
	} catch {
		return "/";
	}
}

export function SignInForm() {
	const t = useT();
	const router = useRouter();
	const search = useSearchParams();
	const signedUp = search.get("signedUp") === "1";
	const [email, setEmail] = useState(signedUp ? (search.get("email") ?? "") : "");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!password) {
			setError(t("auth.enterPassword"));
			return;
		}
		setBusy(true);
		setError(null);
		try {

			await endBrowserSession().catch(() => {});
			const { isSignedIn, nextStep } = await signIn({ username: email, password });

			if (!isSignedIn && nextStep.signInStep === "CONFIRM_SIGN_UP") {
				router.push(`/confirm?email=${encodeURIComponent(email)}`);
				return;
			}
			if (!isSignedIn) {

				setError(t("auth.unsupportedStep", { step: nextStep.signInStep }));
				return;
			}

			startBrowserSession();
			const me = await syncProfileAfterSignIn(email);

			router.replace(await destinationFor(me, search.get("next")));
		} catch (err) {
			if (isName(err, "UserNotConfirmedException")) {
				router.push(`/confirm?email=${encodeURIComponent(email)}`);
				return;
			}

			if (isAccountGate(err)) {
				router.replace("/gate");
				return;
			}
			setError(cognitoMessage(t, err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Slip footer={<span style={TIGHT_LABEL}>{t("auth.noAccount")} <Link href="/sign-up">{t("auth.signUp")}</Link></span>}>
			<form onSubmit={submit}>
				<FormError>{error}</FormError>
				{signedUp && !error ? (
					<div role="status" style={{ marginBottom: "var(--space-6)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
						{t("auth.signedUpNotice")}
					</div>
				) : null}
				<Field label={t("auth.email")}>
					<Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} size="lg" />
				</Field>
				<Field label={t("auth.password")}>
					<Input type="password" autoComplete="current-password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} size="lg" />
				</Field>
				<Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
					{busy ? t("auth.signingIn") : t("auth.signIn")}
				</Button>
			</form>
		</Slip>
	);
}
