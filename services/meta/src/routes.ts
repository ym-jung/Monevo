import { Hono } from "hono";

import { ok } from "@monevo/http";
import type { RequestVariables } from "@monevo/http";

import type { CurrencyService } from "./service/currency-service.ts";
import { enumCatalog } from "./service/enum-catalog.ts";

export interface RouteDeps {
	currencies: CurrencyService;
}

export function createRoutes(deps: RouteDeps): Hono<{ Variables: RequestVariables }> {
	const routes = new Hono<{ Variables: RequestVariables }>();

	routes.get("/api/v1/meta/currencies", async (c) => c.json(ok(await deps.currencies.listActive())));

	routes.get("/api/v1/meta/enums", (c) => c.json(ok(enumCatalog())));

	return routes;
}
