"use client";

import { Badge, Button, EmptyState } from "@/ds";
import type { CategoryKind, CategoryNode } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";

import { type InkLookup, inkVar } from "@/features/category/ink";

import { EYEBROW, ROW, SheetHeader, useSheetStyle } from "./panelChrome";

export function CategoriesPanel({ categories, onNew, onEdit, inkOf }: {
	categories: CategoryNode[];
	onNew: () => void;
	onEdit: (category: CategoryNode) => void;
	inkOf: InkLookup;
}) {
	const sheet = useSheetStyle();
	const t = useT();

	const groups: { kind: CategoryKind; label: string }[] = [
		{ kind: "EXPENSE", label: t("kind.expense") },
		{ kind: "INCOME", label: t("kind.income") },
	];

	return (
		<section style={sheet}>
			<SheetHeader label={t("sidebar.categories")} action={<Button icon="plus" onClick={onNew}>{t("sidebar.newCategory")}</Button>} />
			{groups.map(({ kind, label }) => {
				const roots = categories.filter((c) => c.kind === kind);
				if (roots.length === 0) return null;
				return (
					<div key={kind}>
						<div style={{ ...EYEBROW, padding: "var(--space-8) 0 var(--space-3)" }}>{label}</div>
						{roots.map((root) => (
							<div key={root.id}>
								<CategoryRow category={root} onEdit={onEdit} inkOf={inkOf} />
								{root.children.map((child) => (
									<CategoryRow key={child.id} category={child} onEdit={onEdit} inkOf={inkOf} indent />
								))}
							</div>
						))}
					</div>
				);
			})}
			{categories.length === 0 ? <EmptyState icon="tag" title={t("sidebar.categories")} /> : null}
		</section>
	);
}

function CategoryRow({ category, onEdit, inkOf, indent = false }: {
	category: CategoryNode;
	onEdit: (category: CategoryNode) => void;
	inkOf: InkLookup;
	indent?: boolean;
}) {
	const t = useT();
	return (
		<article style={{ ...ROW, paddingLeft: indent ? "var(--space-12)" : undefined }}>
			<span style={{ width: "var(--space-4)", height: "var(--space-4)", borderRadius: "50%", background: inkVar(inkOf(category.id)), flex: "0 0 auto" }} />
			<span style={{ flex: 1, minWidth: 0, font: "var(--type-body)" }}>{category.name}</span>
			{category.isSystem ? <Badge tone="neutral">{t("categories.seeded")}</Badge> : null}
			<Button size="sm" variant="ghost" icon="pencil" onClick={() => onEdit(category)} />
		</article>
	);
}
