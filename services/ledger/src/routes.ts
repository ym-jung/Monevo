import { Hono } from "hono";

import type { AuthVariables } from "@monevo/auth";
import { ok } from "@monevo/http";

import { parseInviteRequest, parseLedgerCreate, parseLedgerUpdate } from "./domain/requests.ts";

import type { InviteService } from "./service/invite-service.ts";
import type { LedgerService } from "./service/ledger-service.ts";
import type { MemberService } from "./service/member-service.ts";

export interface RouteDeps {
	ledgers: LedgerService;
	members: MemberService;
	invites: InviteService;
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

	routes.get("/api/v1/ledgers", async (c) =>
		c.json(ok(await deps.ledgers.listMine(c.get("currentUser").id))),
	);

	routes.post("/api/v1/ledgers", async (c) => {
		const me = c.get("currentUser");
		const body = parseLedgerCreate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.ledgers.create(body, me.id, me.locale)), 201);
	});

	routes.get("/api/v1/ledgers/:id", async (c) =>
		c.json(ok(await deps.ledgers.get(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.patch("/api/v1/ledgers/:id", async (c) => {
		const body = parseLedgerUpdate(await jsonBody(c.req.raw));

		return c.json(ok(await deps.ledgers.rename(c.req.param("id"), body, c.get("currentUser").id)));
	});

	routes.delete("/api/v1/ledgers/:id", async (c) => {
		await deps.ledgers.remove(c.req.param("id"), c.get("currentUser").id);

		return c.body(null, 204);
	});

	routes.get("/api/v1/ledgers/:id/members", async (c) =>
		c.json(ok(await deps.members.list(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.delete("/api/v1/ledgers/:id/members/:userId", async (c) => {
		const me = c.get("currentUser");
		const ledgerId = c.req.param("id");
		const targetUserId = c.req.param("userId");

		if (targetUserId === me.id) {
			await deps.members.leave(ledgerId, me.id);
		} else {
			await deps.members.evict(ledgerId, targetUserId, me.id);
		}

		return c.body(null, 204);
	});

	routes.post("/api/v1/ledgers/:id/invites", async (c) => {
		const body = parseInviteRequest(await jsonBody(c.req.raw));

		return c.json(
			ok(await deps.invites.issue(c.req.param("id"), c.get("currentUser").id, body)),
			201,
		);
	});

	routes.get("/api/v1/ledgers/:id/invites", async (c) =>
		c.json(ok(await deps.invites.listUsable(c.req.param("id"), c.get("currentUser").id))),
	);

	routes.delete("/api/v1/ledgers/:id/invites/:inviteId", async (c) => {
		await deps.invites.revoke(
			c.req.param("id"),
			c.req.param("inviteId"),
			c.get("currentUser").id,
		);

		return c.body(null, 204);
	});

	routes.post("/api/v1/invites/:code/accept", async (c) =>
		c.json(ok(await deps.invites.accept(c.req.param("code"), c.get("currentUser").id))),
	);

	return routes;
}
