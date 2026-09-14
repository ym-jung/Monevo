import { ValidationError } from "@monevo/http";

export function requireValidTimezone(timezone: string): string {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
	} catch {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field: "timezone", issue: "Pattern", value: timezone },
		]);
	}

	return timezone;
}
