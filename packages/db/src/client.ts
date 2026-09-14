import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.ts";

export type Database = ReturnType<typeof createDatabase>;

export interface Executor {
	execute: Database["execute"];
}

export interface DatabaseOptions {
	url: string;
	max?: number;
	connectTimeoutSeconds?: number;
}

export function createDatabase(options: DatabaseOptions) {
	const client = postgres(options.url, {
		max: options.max ?? 1,
		prepare: false,
		idle_timeout: 20,
		connect_timeout: options.connectTimeoutSeconds ?? 10,
		onnotice: () => {},
	});

	return drizzle(client, { schema });
}

export function transaction<T>(db: Database, run: (tx: Executor) => Promise<T>): Promise<T> {
	return db.transaction((tx) => run(tx));
}

export async function resolveDatabaseUrl(): Promise<string> {
	const direct = process.env["DATABASE_URL"];
	if (direct) return direct;

	const name = process.env["DATABASE_URL_PARAMETER"];
	if (!name) throw new Error("missing env DATABASE_URL or DATABASE_URL_PARAMETER");

	const { GetParameterCommand, SSMClient } = await import("@aws-sdk/client-ssm");
	const result = await new SSMClient({}).send(
		new GetParameterCommand({ Name: name, WithDecryption: true }),
	);

	const value = result.Parameter?.Value;
	if (!value) throw new Error(`parameter ${name} is empty`);

	return value;
}
