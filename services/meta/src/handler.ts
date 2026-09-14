import { handle } from "hono/aws-lambda";

import { createAppFromEnv } from "./app.ts";

export const handler = handle(createAppFromEnv());
