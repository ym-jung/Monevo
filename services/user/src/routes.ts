import { Hono } from "hono";

import type { AuthVariables } from "@monevo/auth";
import { ok } from "@monevo/http";

import {
	parsePaging,
	parseRejectUser,
	parseUpdateProfile,
	parseUpdateUserStatus,
} from "./domain/requests.ts";
import type { AdminService } from "./service/admin-service.ts";
import type { ProfileService } from "./service/profile-service.ts";

export interface RouteDeps {
	profiles: ProfileService;
	admin: AdminService;
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

	routes.get("/api/v1/users/me", async (c) =>
		c.json(ok(await deps.profiles.me(c.get("currentUser").id))),
	);

	routes.patch("/api/v1/users/me", async (c) => {
		const body = parseUpdateProfile(await jsonBody(c.req.raw));

		return c.json(ok(await deps.profiles.update(c.get("currentUser").id, body)));
	});

	routes.get("/api/v1/admin/users", async (c) => {
		const paging = parsePaging(c.req.query("page"), c.req.query("size"));
		const status = c.req.query("status");

		return c.json(ok(await deps.admin.list(status ? { status, ...paging } : paging)));
	});

	routes.post("/api/v1/admin/users/:id/approve", async (c) =>
		c.json(ok(await deps.admin.approve(c.get("currentUser").id, c.req.param("id")))),
	);

	routes.post("/api/v1/admin/users/:id/reject", async (c) => {
		const body = parseRejectUser(await jsonBody(c.req.raw));

		return c.json(
			ok(await deps.admin.reject(c.get("currentUser").id, c.req.param("id"), body.reason ?? null)),
		);
	});

	routes.patch("/api/v1/admin/users/:id/status", async (c) => {
		const body = parseUpdateUserStatus(await jsonBody(c.req.raw));

		return c.json(
			ok(await deps.admin.changeStatus(c.get("currentUser").id, c.req.param("id"), body.status)),
		);
	});

	routes.delete("/api/v1/admin/users/:id", async (c) => {
		await deps.admin.remove(c.get("currentUser").id, c.req.param("id"));

		return c.body(null, 204);
	});

	return routes;
}
