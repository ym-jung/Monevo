import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const ICONS = [
	"archive", "arrow-down-left", "arrow-left", "arrow-left-right", "arrow-up-right",
	"banknote", "book-open", "calendar", "chart-no-axes-column", "chart-pie", "check",
	"chevron-down", "chevron-left", "chevron-right", "circle-check", "circle-pause",
	"circle-x", "clock", "credit-card", "file-text", "filter", "inbox", "info",
	"landmark", "layout-grid", "link", "log-out", "menu", "minus", "panel-left-close",
	"panel-left-open", "pencil", "plus", "receipt-text",
	"refresh-cw", "repeat", "search", "settings", "sidebar", "sliders-horizontal",
	"tag", "ticket", "trash-2", "user", "user-minus", "user-plus", "user-round",
	"users", "wallet", "x",
];

let src;
try {
	src = path.join(path.dirname(require.resolve("lucide-static/package.json")), "icons");
} catch {
	src = "";
}
const dest = path.join(import.meta.dirname, "..", "public", "icons");

if (!src || !existsSync(src)) {
	console.warn("[icons] lucide-static not installed yet, skipping");
	process.exit(0);
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });

const available = new Set((await readdir(src)).filter((f) => f.endsWith(".svg")));
const missing = [];

for (const name of ICONS) {
	const file = `${name}.svg`;
	if (!available.has(file)) {
		missing.push(name);
		continue;
	}
	await copyFile(path.join(src, file), path.join(dest, file));
}

if (missing.length) {
	console.warn(`[icons] not in lucide-static: ${missing.join(", ")}`);
}
console.log(`[icons] ${ICONS.length - missing.length} copied to public/icons`);
