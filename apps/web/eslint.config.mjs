import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const adherence = JSON.parse(readFileSync(join(__dirname, "ds-adherence.rules.json"), "utf8"));

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{

		files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
		rules: {
			"no-restricted-imports": adherence.rules["no-restricted-imports"],
			"no-restricted-syntax": adherence.rules["no-restricted-syntax"],
		},
	},
	{

		files: ["e2e/**/*.ts", "playwright.config.ts"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
			"@next/next/no-assign-module-variable": "off",
		},
	},
	{
		ignores: [
			"node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "src/ds/**",
			"e2e/.auth/**", "e2e/.results/**", "e2e/.report/**",
		],
	},
];

export default eslintConfig;
