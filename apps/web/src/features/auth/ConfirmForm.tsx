"use client";

import { autoSignIn, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/ds";
import { startBrowserSession } from "@/lib/amplify/browserSession.client";
import { useT } from "@/lib/i18n/provider";

import { syncProfileAfterSignIn } from "./api";
import { cognitoMessage } from "./errors";
import { Field, FormError, Slip, TIGHT_LABEL } from "./Slip";

export function ConfirmForm({ email }: { email: string }) {
	const t = useT();
	const router = useRouter();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (code.replace(/\D/g, "").length !== 6) {
			setError(t("confirm.sixDigits"));
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { nextStep } = await confirmSignUp({ username: email, confirmationCode: code.trim() });

			if (nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
				await autoSignIn();
				startBrowserSession();

				await syncProfileAfterSignIn(email).catch(() => {});
				router.replace("/gate");
				router.refresh();
				return;
			}

			router.replace(`/sign-in?signedUp=1&email=${encodeURIComponent(email)}`);
		} catch (err) {
			setError(cognitoMessage(t, err));
		} finally {
			setBusy(false);
		}
	}

	async function resend() {
		setError(null);
		setNotice(null);
		try {
			await resendSignUpCode({ username: email });
			setNotice(t("confirm.resent"));
		} catch (err) {
			setError(cognitoMessage(t, err));
		}
	}

	return (
		<Slip footer={<Link href="/sign-up" style={TIGHT_LABEL}>{t("confirm.otherEmail")}</Link>}>
			<form onSubmit={submit}>
				<div style={{ font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty", marginBottom: "var(--space-8)" }}>
					{t("confirm.sentTo", { email })}
				</div>
				<FormError>{error}</FormError>
				{notice ? <div style={{ ...TIGHT_LABEL, marginBottom: "var(--space-6)" }}>{notice}</div> : null}
				<Field label={t("confirm.code")}>
					<Input
						value={code}
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						onChange={(e) => setCode(e.target.value)}
						size="lg"
						align="center"
						style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.35em" }}
					/>
				</Field>
				<Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
					{busy ? t("confirm.confirming") : t("confirm.submit")}
				</Button>
				<div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
					<Button variant="ghost" size="sm" onClick={resend}>{t("confirm.resend")}</Button>
				</div>
			</form>
		</Slip>
	);
}
