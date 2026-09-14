import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";

import { createDatabase, transaction } from "../src/client.ts";
import { newId } from "../src/uuid.ts";
import type { Database } from "../src/client.ts";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("transaction", () => {
	let db: Database;

	beforeAll(() => {
		db = createDatabase({ url: url!, max: 2 });
	});

	afterAll(async () => {
		await db.$client.end();
	});

	async function userExists(id: string): Promise<boolean> {
		const rows = await db.execute<{ ok: boolean }>(sql`
			SELECT EXISTS (SELECT 1 FROM app_user WHERE id = ${id}::uuid) AS ok`);

		return rows[0]?.ok === true;
	}

	async function insertUser(executor: { execute: Database["execute"] }, id: string): Promise<void> {
		await executor.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency)
			VALUES (${id}::uuid, ${newId()}::uuid, ${id + "@e.com"}, ${id + "@e.com"}, 'T', 'JPY')`);
	}

	it("commits every write when the block returns", async () => {
		const first = newId();
		const second = newId();

		await transaction(db, async (tx) => {
			await insertUser(tx, first);
			await insertUser(tx, second);
		});

		expect(await userExists(first)).toBe(true);
		expect(await userExists(second)).toBe(true);
	});

	it("rolls back an earlier write when a later one throws", async () => {
		const first = newId();

		await expect(
			transaction(db, async (tx) => {
				await insertUser(tx, first);
				throw new Error("something went wrong after the first write");
			}),
		).rejects.toThrow("something went wrong");

		expect(await userExists(first)).toBe(false);
	});

	it("rolls back when the database rejects a later write", async () => {
		const first = newId();

		await expect(
			transaction(db, async (tx) => {
				await insertUser(tx, first);
				await insertUser(tx, first);
			}),
		).rejects.toThrow();

		expect(await userExists(first)).toBe(false);
	});

	it("returns what the block returns", async () => {
		const id = newId();

		const returned = await transaction(db, async (tx) => {
			await insertUser(tx, id);
			return "done";
		});

		expect(returned).toBe("done");
	});
});
