export const SERVICES = ["meta", "report", "ledger", "account", "user", "journal"] as const;

export type ServiceName = (typeof SERVICES)[number];

const BY_FIRST_SEGMENT: Record<string, ServiceName> = {
	meta: "meta",
	users: "user",
	admin: "user",
	accounts: "account",
	categories: "account",
	invites: "ledger",
	ledgers: "ledger",
	"journal-entries": "journal",
};

const LEDGER_SUBRESOURCE: Record<string, ServiceName> = {
	categories: "account",
	summary: "report",
	analysis: "report",
};

export function serviceFor(segments: readonly string[]): ServiceName | undefined {
	const first = segments[0];
	if (!first) return undefined;

	const service = BY_FIRST_SEGMENT[first];
	if (service !== "ledger" || segments.length < 3) return service;

	return LEDGER_SUBRESOURCE[segments[2]!] ?? service;
}

export function serviceForPath(path: string): ServiceName | undefined {
	return serviceFor(path.replace(/^\/+/, "").split("/"));
}
