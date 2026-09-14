import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	out: "./.drizzle",
	dbCredentials: { url: process.env["DATABASE_URL"] ?? "" },
	introspect: { casing: "camel" },
	schemaFilter: ["public"],
	tablesFilter: ["!flyway_schema_history"],
});
