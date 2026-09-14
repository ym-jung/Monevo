import type { CategoryNode } from "@/lib/api/types";

const EXPENSE_INKS = ["groceries", "rent", "transport", "dining", "utilities"] as const;

export type CategoryInk = (typeof EXPENSE_INKS)[number] | "income" | "transfer";

const SEEDED: Record<string, CategoryInk> = {

	"식비": "groceries",
	"食費": "groceries",
	"Food": "groceries",

	"주거/공과금": "rent",
	"住居・光熱費": "rent",
	"Housing/Utilities": "rent",

	"교통": "transport",
	"交通費": "transport",
	"Transportation": "transport",

	"문화/여가": "dining",
	"의료/건강": "dining",
	"教養・娯楽": "dining",
	"医療・健康": "dining",
	"Culture/Leisure": "dining",
	"Medical/Health": "dining",

	"생활용품": "utilities",
	"교육": "transport",
	"경조사/선물": "rent",
	"보험/세금": "utilities",
	"기타 지출": "utilities",
	"日用品": "utilities",
	"教育": "transport",
	"交際費": "rent",
	"保険・税金": "utilities",
	"その他支出": "utilities",
	"Household Items": "utilities",
	"Education": "transport",
	"Events/Gifts": "rent",
	"Insurance/Taxes": "utilities",
	"Other Expenses": "utilities",
};

function hash(value: string): number {
	let result = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		result ^= value.charCodeAt(index);
		result = Math.imul(result, 16777619);
	}
	return result >>> 0;
}

export function rootInk(category: Pick<CategoryNode, "id" | "name" | "kind">): CategoryInk {
	if (category.kind === "INCOME") return "income";
	return SEEDED[category.name] ?? EXPENSE_INKS[hash(category.name || category.id) % EXPENSE_INKS.length];
}

export function inkVar(ink: CategoryInk): string {
	return `var(--cat-${ink})`;
}

export type InkLookup = (categoryId: string | null | undefined) => CategoryInk;

export function buildInkLookup(roots: CategoryNode[]): InkLookup {
	const byId = new Map<string, CategoryInk>();
	const walk = (node: CategoryNode, ink: CategoryInk) => {
		byId.set(node.id, ink);
		node.children.forEach((child) => walk(child, ink));
	};
	roots.forEach((root) => walk(root, rootInk(root)));

	return (id) => (id ? (byId.get(id) ?? "transfer") : "transfer");
}
