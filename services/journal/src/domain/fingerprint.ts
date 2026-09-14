import { createHash } from "node:crypto";
import type { Hash } from "node:crypto";

import type { JournalEntryCreateRequest } from "@monevo/contracts";

const SCHEMA_VERSION = "journal-entry-create-v2";

function updateLength(digest: Hash, length: number): void {
	const header = Buffer.allocUnsafe(4);
	header.writeInt32BE(length, 0);
	digest.update(header);
}

function updateChunk(digest: Hash, value: string): void {
	const bytes = Buffer.from(value, "utf8");
	updateLength(digest, bytes.length);
	digest.update(bytes);
}

function update(digest: Hash, fieldName: string, value: string | null | undefined): void {
	updateChunk(digest, fieldName);

	if (value === null || value === undefined) {
		updateLength(digest, -1);
		return;
	}

	updateChunk(digest, value);
}

export function plainDecimal(value: string | null | undefined): string | null {
	if (value === null || value === undefined) return null;

	const negative = value.startsWith("-");
	const digits = negative ? value.slice(1) : value;
	const [whole = "", fraction = ""] = digits.split(".");

	const trimmedFraction = fraction.replace(/0+$/, "");
	const trimmedWhole = whole.replace(/^0+(?=\d)/, "");
	const rendered = trimmedFraction === "" ? trimmedWhole : `${trimmedWhole}.${trimmedFraction}`;

	return rendered === "0" || rendered === "" ? "0" : `${negative ? "-" : ""}${rendered}`;
}

export function fingerprint(request: JournalEntryCreateRequest): string {
	const digest = createHash("sha256");

	update(digest, "schema", SCHEMA_VERSION);
	update(digest, "ledgerId", request.ledgerId);
	update(digest, "entryDate", request.entryDate);
	update(digest, "description", request.description);
	update(digest, "memo", request.memo);
	update(digest, "lineCount", String(request.lines.length));

	for (const line of request.lines) {
		update(digest, "side", line.side);
		update(digest, "accountId", line.accountId);
		update(digest, "amountMinor", String(line.amountMinor));
		update(digest, "currency", line.currency);
		update(digest, "fxRate", plainDecimal(line.fxRate));
		update(digest, "lineMemo", line.memo);
	}

	return digest.digest("hex");
}
