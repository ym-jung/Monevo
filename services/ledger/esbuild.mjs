import { build } from "esbuild";
import { statSync } from "node:fs";

const outfile = "dist/index.mjs";

await build({
	entryPoints: ["src/handler.ts"],
	bundle: true,
	external: ["@aws-sdk/*"],
	platform: "node",
	target: "node22",
	format: "esm",
	outfile,
	minify: true,
	sourcemap: "linked",
	banner: {
		js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
	},
});

const { size } = statSync(outfile);
console.log(`${outfile} ${(size / 1024).toFixed(1)} kB`);
