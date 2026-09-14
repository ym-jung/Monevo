"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, Button, Input, Select } from "@/ds";
import { ApiError } from "@/lib/api/errors";
import type { UserSummary } from "@/lib/api/types";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { useT } from "@/lib/i18n/provider";
import { useCurrencies } from "@/lib/money/currency";

import { updateMe } from "./api";
import { LOCALE_OPTIONS, TIMEZONE_OPTIONS } from "./options";
import { Field, FormError, Slip, TIGHT_LABEL } from "./Slip";

const LIMITS = { email: 255, displayName: 60, timezone: 64 };

export function ProfileForm({ user }: { user: UserSummary }) {
	const t = useT();
	const router = useRouter();
	const currencies = useCurrencies();

	const [email, setEmail] = useState(user.email);
	const [displayName, setDisplayName] = useState(user.displayName);
	const [displayCurrency, setDisplayCurrency] = useState(user.displayCurrency ?? "");
	const [locale, setLocale] = useState(user.locale ?? "en");
	const [timezone, setTimezone] = useState(user.timezone ?? "Asia/Tokyo");
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [busy, setBusy] = useState(false);

	const pending = user.status === "PENDING";
	const emailOk = /.+@.+\..+/.test(email);
	const valid = emailOk && displayName.trim().length > 0;

	function edited<T>(setter: (value: T) => void) {
		return (value: T) => {
			setter(value);
			setSaved(false);
		};
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await updateMe({
				email,
				displayName: displayName.trim(),

				displayCurrency: displayCurrency || undefined,
				locale,
				timezone,
			});
			setSaved(true);

			document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=strict`;
			router.refresh();
		} catch (err) {

			setError(err instanceof ApiError ? err.message : t("profile.saveFailed"));
		} finally {
			setBusy(false);
		}
	}

	const currencyOptions = currencies.map((c) => ({ value: c.code, label: `${c.code} · ${c.nameEn}` }));

	return (
		<Slip
			width={440}
			footer={<Link href={pending ? "/gate" : "/"} style={TIGHT_LABEL}>{pending ? t("profile.backToStatus") : t("profile.backToLedger")}</Link>}
		>
			<form onSubmit={submit}>
				<div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", paddingBottom: "var(--space-8)", borderBottom: "var(--rule-total)" }}>
					<Avatar name={displayName} size={34} />
					<span style={{ flex: 1, minWidth: 0 }}>
						<span style={{ display: "block", font: "var(--type-title-3)", letterSpacing: "var(--tracking-normal)", textTransform: "uppercase", color: "var(--text-primary)" }}>{t("profile.title")}</span>
						{pending ? <span style={{ display: "block", ...TIGHT_LABEL, marginTop: "var(--space-2)" }}>{t("profile.editableWhilePending")}</span> : null}
					</span>
				</div>

				<div style={{ paddingTop: "var(--space-8)" }}>
					<FormError>{error}</FormError>

					<Field label={t("auth.email")} note={t("profile.emailNote")}>
						<Input type="email" value={email} maxLength={LIMITS.email} onChange={(e) => edited(setEmail)(e.target.value)} size="lg" invalid={email.length > 0 && !emailOk} />
					</Field>

					<Field label={t("auth.displayName")} note={t("common.count", { n: displayName.length, max: LIMITS.displayName })}>
						<Input value={displayName} maxLength={LIMITS.displayName} onChange={(e) => edited(setDisplayName)(e.target.value)} size="lg" />
					</Field>

					<Field label={t("profile.displayCurrency")} note={t("profile.displayCurrencyNote")}>
						<Select value={displayCurrency} size="lg" placeholder={t("profile.notSet")} onChange={edited(setDisplayCurrency)} options={currencyOptions} />
					</Field>

					<Field label={t("profile.language")}>
						<Select value={locale} size="lg" onChange={edited(setLocale)} options={LOCALE_OPTIONS} />
					</Field>

					<Field label={t("profile.timezone")} note={t("profile.timezoneNote")}>
						<Select value={timezone} size="lg" onChange={edited(setTimezone)} options={TIMEZONE_OPTIONS} />
					</Field>

					<Button type="submit" variant="primary" size="lg" fullWidth disabled={!valid || busy || saved}>
						{saved ? t("profile.saved") : busy ? t("profile.saving") : t("profile.save")}
					</Button>
				</div>
			</form>
		</Slip>
	);
}
