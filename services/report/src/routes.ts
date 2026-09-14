import { Hono } from "hono";

import type { SummaryBucket } from "@monevo/contracts";
import { ok, ValidationError } from "@monevo/http";
import type { RequestVariables } from "@monevo/http";

import { parseDate } from "./domain/period.ts";
import type { SummaryService } from "./service/summary-service.ts";

export interface CurrentUser {
	id: string;
}

export interface AuthenticatedVariables extends RequestVariables {
	currentUser: CurrentUser;
}

export interface RouteDeps {
	summaries: SummaryService;
}

function requiredParam(value: string | undefined, field: string): string {
	if (!value) {
		throw new ValidationError("VALIDATION_FAILED", [{ field, issue: "NotNull", value: null }]);
	}
	return value;
}

function parseBucket(value: string | undefined): SummaryBucket {
	if (value === undefined || value === "DAY") return "DAY";
	if (value === "MONTH") return "MONTH";

	throw new ValidationError("VALIDATION_FAILED", [{ field: "bucket", issue: "Pattern", value }]);
}

export function createRoutes(deps: RouteDeps): Hono<{ Variables: AuthenticatedVariables }> {
	const routes = new Hono<{ Variables: AuthenticatedVariables }>();

	routes.get("/api/v1/ledgers/:id/summary", async (c) => {
		const summary = await deps.summaries.monthly({
			ledgerId: c.req.param("id"),
			month: requiredParam(c.req.query("month"), "month"),
			accountIds: c.req.queries("accountId") ?? [],
			categoryIds: c.req.queries("categoryId") ?? [],
			requesterId: c.get("currentUser").id,
		});

		return c.json(ok(summary));
	});

	routes.get("/api/v1/ledgers/:id/analysis", async (c) => {
		const summary = await deps.summaries.period({
			ledgerId: c.req.param("id"),
			from: parseDate(requiredParam(c.req.query("from"), "from"), "from"),
			to: parseDate(requiredParam(c.req.query("to"), "to"), "to"),
			bucket: parseBucket(c.req.query("bucket")),
			accountIds: c.req.queries("accountId") ?? [],
			categoryIds: c.req.queries("categoryId") ?? [],
			requesterId: c.get("currentUser").id,
		});

		return c.json(ok(summary));
	});

	return routes;
}
