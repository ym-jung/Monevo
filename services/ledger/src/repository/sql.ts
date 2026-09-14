import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export function idList(ids: readonly string[]): SQL {
	return sql`(${sql.join(
		ids.map((id) => sql`${id}::uuid`),
		sql`, `,
	)})`;
}
