import { Hono } from "hono";

import type { AuthVariables } from "@monevo/auth";
import { ok } from "@monevo/http";

import { parseEntryCreate, parseEntryUpdate, parseKinds, parseOptionalDate, parsePaging, requiredUuidQuery } from "./domain/requests.ts";
import type { JournalService } from "./service/journal-service.ts";

export interface RouteDeps {
	journal: JournalService;
}

async function jsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
}

export function createRoutes(deps: RouteDeps): Hono<{ Variables: AuthVariables }> {
	const routes = new Hono<{ Variables: AuthVariables }>();

	routes.post("/api/v1/journal-entries", async (c) => {
		const body = parseEntryCreate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.journal.create(body, c.get("currentUser").id)), 201);
	});

	routes.get("/api/v1/journal-entries", async (c) => {
		const paging = parsePaging(c.req.query("page"), c.req.query("size"));
		const from = parseOptionalDate(c.req.query("from"), "from");
		const to = parseOptionalDate(c.req.query("to"), "to");

		return c.json(
			ok(
				await deps.journal.search(
					{
						ledgerId: requiredUuidQuery(c.req.query("ledgerId"), "ledgerId"),
						...(from ? { from } : {}),
						...(to ? { to } : {}),
						accountIds: c.req.queries("accountId") ?? [],
						categoryIds: c.req.queries("categoryId") ?? [],
						kinds: parseKinds(c.req.queries("kind") ?? []),
						...paging,
					},
					c.get("currentUser").id,
				),
			),
		);
	});

	routes.get("/api/v1/journal-entries/:id", async (c) =>
		c.json(ok(await deps.journal.get(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.patch("/api/v1/journal-entries/:id", async (c) => {
		const body = parseEntryUpdate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.journal.update(c.req.param("id"), body, c.get("currentUser").id)));
	});

	routes.delete("/api/v1/journal-entries/:id", async (c) => {
		await deps.journal.remove(c.req.param("id"), c.get("currentUser").id);

		return c.body(null, 204);
	});

	return routes;
}
