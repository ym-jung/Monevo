import { copyFile, readFile, writeFile } from "node:fs/promises";

const ADVISORY = /^\t*\/\/ You can use \{ mode: "bigint" \}.*\n/gm;
const MINOR_COLUMN = /(bigint\("[a-z_]*_minor", \{ mode: )"number"( \})/g;

async function normalize(name) {
	const source = `.drizzle/${name}`;
	const target = `src/${name}`;

	const original = await readFile(source, "utf8");
	const normalized = original.replace(ADVISORY, "").replace(MINOR_COLUMN, '$1"bigint"$2');

	await writeFile(target, normalized);

	return { name, comments: original.length - normalized.length > 0 };
}

await copyFile(".drizzle/relations.ts", "src/relations.ts");
const { name } = await normalize("schema.ts");

const written = await readFile("src/schema.ts", "utf8");
const remaining = written.split("\n").filter((line) => line.includes("//")).length;
const moneyAsNumber = /_minor", \{ mode: "number" \}/.test(written);

if (remaining > 0) throw new Error(`${name} still carries ${remaining} comment lines`);
if (moneyAsNumber) throw new Error(`${name} still maps a _minor column to number`);

console.log(`src/schema.ts and src/relations.ts normalized`);
