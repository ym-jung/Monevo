const SCOPES = [
	"meta", "fx", "user", "ledger", "account", "journal", "report", "admin",
	"web", "mobile", "infra", "db", "auth", "deps", "deps-dev", "release",
];

const TYPES = [
	"feat", "fix", "perf", "refactor",
	"docs", "style", "test", "build", "ci", "chore", "revert",
];

export default {
	extends: ["@commitlint/config-conventional"],

	ignores: [(message) => /^chore\(deps(-dev)?\)!?: /.test(message)],

	rules: {
		"header-max-length": [2, "always", 72],
		"subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
		"subject-empty": [2, "never"],
		"subject-full-stop": [2, "never", "."],
		"type-empty": [2, "never"],
		"type-case": [2, "always", "lower-case"],
		"type-enum": [2, "always", TYPES],
		"scope-case": [2, "always", "lower-case"],
		"scope-enum": [2, "always", SCOPES],
	},
};
