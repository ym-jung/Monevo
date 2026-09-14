import { Hono } from "hono";

import type { AuthVariables } from "@monevo/auth";
import type { CategoryKind } from "@monevo/contracts";
import { ok, ValidationError } from "@monevo/http";

import {
	parseAccountCreate,
	parseAccountUpdate,
	parseCategoryCreate,
	parseCategoryUpdate,
} from "./domain/requests.ts";
import type { AccountService } from "./service/account-service.ts";
import type { CategoryService } from "./service/category-service.ts";

export interface RouteDeps {
	accounts: AccountService;
	categories: CategoryService;
}

async function jsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
}

function parseKind(value: string | undefined): CategoryKind | undefined {
	if (value === undefined) return undefined;
	if (value === "EXPENSE" || value === "INCOME") return value;

	throw new ValidationError("VALIDATION_FAILED", [
		{ field: "kind", issue: "Pattern", value },
	]);
}

export function createRoutes(deps: RouteDeps): Hono<{ Variables: AuthVariables }> {
	const routes = new Hono<{ Variables: AuthVariables }>();

	routes.get("/api/v1/accounts", async (c) =>
		c.json(
			ok(
				await deps.accounts.list(
					c.req.query("ledgerId"),
					c.req.query("includeArchived") === "true",
					c.get("currentUser").id,
				),
			),
		),
	);

	routes.post("/api/v1/accounts", async (c) => {
		const body = parseAccountCreate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.accounts.create(body, c.get("currentUser").id)), 201);
	});

	routes.get("/api/v1/accounts/:id", async (c) =>
		c.json(ok(await deps.accounts.get(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.patch("/api/v1/accounts/:id", async (c) => {
		const body = parseAccountUpdate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.accounts.update(c.req.param("id"), body, c.get("currentUser").id)));
	});

	routes.delete("/api/v1/accounts/:id", async (c) => {
		await deps.accounts.remove(c.req.param("id"), c.get("currentUser").id);

		return c.body(null, 204);
	});

	routes.put("/api/v1/accounts/:id/ledgers/:ledgerId", async (c) => {
		await deps.accounts.link(
			c.req.param("id"),
			c.req.param("ledgerId"),
			c.get("currentUser").id,
		);

		return c.body(null, 204);
	});

	routes.delete("/api/v1/accounts/:id/ledgers/:ledgerId", async (c) => {
		await deps.accounts.unlink(
			c.req.param("id"),
			c.req.param("ledgerId"),
			c.get("currentUser").id,
		);

		return c.body(null, 204);
	});

	routes.get("/api/v1/accounts/:id/balance", async (c) =>
		c.json(ok(await deps.accounts.balance(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.get("/api/v1/ledgers/:ledgerId/categories", async (c) =>
		c.json(
			ok(
				await deps.categories.tree(
					c.req.param("ledgerId"),
					parseKind(c.req.query("kind")),
					c.get("currentUser").id,
				),
			),
		),
	);

	routes.post("/api/v1/ledgers/:ledgerId/categories", async (c) => {
		const body = parseCategoryCreate(await jsonBody(c.req.raw));

		return c.json(
			ok(await deps.categories.create(c.req.param("ledgerId"), body, c.get("currentUser").id)),
			201,
		);
	});

	routes.patch("/api/v1/categories/:id", async (c) => {
		const body = parseCategoryUpdate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.categories.update(c.req.param("id"), body, c.get("currentUser").id)));
	});

	routes.delete("/api/v1/categories/:id", async (c) => {
		await deps.categories.remove(c.req.param("id"), c.get("currentUser").id);

		return c.body(null, 204);
	});

	return routes;
}
