"use client";

import { signUp } from "aws-amplify/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input, Select } from "@/ds";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { useLocale, useT } from "@/lib/i18n/provider";
import { useCurrencies } from "@/lib/money/currency";

import { cognitoMessage } from "./errors";
import { defaultTimezone, LOCALE_OPTIONS, TIMEZONE_OPTIONS } from "./options";
import { stashPendingProfile } from "./pendingProfile";
import { Field, FormError, RULE, Slip, TIGHT_LABEL } from "./Slip";

const MIN_LENGTH = 12;

function passwordProblems(password: string): MessageKey[] {
	const problems: MessageKey[] = [];
	if (password.length < MIN_LENGTH) problems.push("auth.passwordLength");
	if (!/[A-Z]/.test(password)) problems.push("auth.passwordUpper");
	if (!/[a-z]/.test(password)) problems.push("auth.passwordLower");
	if (!/\d/.test(password)) problems.push("auth.passwordDigit");
	if (!/[^A-Za-z0-9]/.test(password)) problems.push("auth.passwordSymbol");
	return problems;
}

export function SignUpForm() {
	const t = useT();
	const router = useRouter();
	const currencies = useCurrencies();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");

	const [locale, setLocale] = useState<string>(useLocale());
	const [displayCurrency, setDisplayCurrency] = useState("");
	const [timezone, setTimezone] = useState(defaultTimezone);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const emailOk = /.+@.+\..+/.test(email);
	const problems = passwordProblems(password);
	const valid = emailOk && problems.length === 0 && name.trim().length > 0 && name.length <= 60;

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {

			await signUp({
				username: email,
				password,
				options: { autoSignIn: true, userAttributes: { email, name: name.trim() } },
			});
			stashPendingProfile({ displayName: name.trim(), locale, displayCurrency, timezone });
			router.push(`/confirm?email=${encodeURIComponent(email)}`);
		} catch (err) {
			setError(cognitoMessage(t, err));
		} finally {
			setBusy(false);
		}
	}

	const currencyOptions = currencies.map((c) => ({ value: c.code, label: `${c.code} · ${c.nameEn}` }));

	return (
		<Slip footer={<span style={TIGHT_LABEL}>{t("auth.haveAccount")} <Link href="/sign-in">{t("auth.signIn")}</Link></span>}>
			<form onSubmit={submit}>
				<FormError>{error}</FormError>
				<Field label={t("auth.email")}>
					<Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} size="lg" invalid={email.length > 0 && !emailOk} />
				</Field>
				<Field label={t("auth.displayName")} note={t("common.count", { n: name.length, max: 60 })}>
					<Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} size="lg" />
				</Field>
				<Field
					label={t("auth.password")}
					note={
						password.length > 0 && problems.length > 0
							? t("auth.passwordStillNeeds", { missing: problems.map((k) => t(k, { min: MIN_LENGTH })).join(", ") })
							: t("auth.passwordRule", { min: MIN_LENGTH })
					}
				>
					<Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} size="lg" invalid={password.length > 0 && problems.length > 0} />
				</Field>

				<Field label={t("profile.language")}>
					<Select value={locale} size="lg" onChange={setLocale} options={LOCALE_OPTIONS} />
				</Field>
				<Field label={t("profile.displayCurrency")} note={t("profile.displayCurrencyNote")}>
					<Select value={displayCurrency} size="lg" placeholder={t("profile.notSet")} onChange={setDisplayCurrency} options={currencyOptions} />
				</Field>
				<Field label={t("profile.timezone")} note={t("profile.timezoneNote")}>
					<Select value={timezone} size="lg" onChange={setTimezone} options={TIMEZONE_OPTIONS} />
				</Field>

				<Button type="submit" variant="primary" size="lg" fullWidth disabled={!valid || busy}>
					{busy ? t("auth.creating") : t("auth.createAccount")}
				</Button>
				<div style={{ ...RULE, marginTop: "var(--space-8)", paddingTop: "var(--space-6)", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>
					{t("auth.reviewNotice")}
				</div>
			</form>
		</Slip>
	);
}
