import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist/**", "coverage/**"] },
	...tseslint.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { args: "none", caughtErrors: "all" }],
			"no-restricted-imports": [
				"error",
				{ patterns: [{ group: ["**/services/*"], message: "services must not import each other" }] },
			],
		},
	},
);
