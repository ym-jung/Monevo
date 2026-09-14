import type { Metadata, Viewport } from "next";

import { AmplifyProvider } from "@/lib/amplify/provider";
import { publicConfig } from "@/lib/env";
import { LocaleCookieSync } from "@/lib/i18n/LocaleCookieSync";
import { I18nProvider } from "@/lib/i18n/provider";
import { resolveLocale } from "@/lib/i18n/server";
import { CurrencyMetaProvider } from "@/lib/money/currency";
import { loadCurrencies } from "@/lib/money/server";
import { ViewportProvider } from "@/lib/viewport/provider";
import { resolvePhone } from "@/lib/viewport/server";

import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Monevo",
	description: "多通貨対応の共有／個人向け家計簿",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const config = publicConfig();
	const [locale, currencies, phone] = await Promise.all([resolveLocale(), loadCurrencies(), resolvePhone()]);

	return (
		<html lang={locale}>
			<body>
				<LocaleCookieSync locale={locale} />
				<I18nProvider locale={locale}>
					<ViewportProvider initialPhone={phone}>
						<AmplifyProvider config={config}>
							<CurrencyMetaProvider currencies={currencies}>{children}</CurrencyMetaProvider>
						</AmplifyProvider>
					</ViewportProvider>
				</I18nProvider>
			</body>
		</html>
	);
}
