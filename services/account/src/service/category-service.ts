import type {
	CategoryCreateRequest,
	CategoryKind,
	CategoryNode,
	CategoryUpdateRequest,
} from "@monevo/contracts";
import { ConflictError, NotFoundError, ValidationError } from "@monevo/http";

import { SORT_STEP } from "../domain/account.ts";
import type { AccountRow } from "../repository/account-repository.ts";
import type { AccountRepository } from "../repository/account-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";
import type { AccessChecker } from "./access-checker.ts";

export interface CategoryService {
	tree(ledgerId: string, kind: CategoryKind | undefined, requesterId: string): Promise<CategoryNode[]>;
	create(ledgerId: string, request: CategoryCreateRequest, requesterId: string): Promise<CategoryNode>;
	update(categoryId: string, request: CategoryUpdateRequest, requesterId: string): Promise<CategoryNode>;
	remove(categoryId: string, requesterId: string): Promise<void>;
}

function natureOf(kind: CategoryKind): string {
	return kind === "INCOME" ? "INCOME" : "EXPENSE";
}

function kindOf(nature: string): CategoryKind {
	return nature === "INCOME" ? "INCOME" : "EXPENSE";
}

function toNode(row: AccountRow, children: CategoryNode[]): CategoryNode {
	return {
		id: row.id,
		name: row.name,
		kind: kindOf(row.nature),
		isSystem: row.is_system,
		sortOrder: row.sort_order,
		children,
	};
}

export function createCategoryService(
	accounts: AccountRepository,
	scopes: ScopeRepository,
	access: AccessChecker,
): CategoryService {
	async function requireCategory(categoryId: string): Promise<AccountRow> {
		const category = await accounts.findById(categoryId, "CATEGORY");
		if (!category) throw new NotFoundError("CATEGORY_NOT_FOUND");

		return category;
	}

	return {
		tree: async (ledgerId, kind, requesterId) => {
			await access.requireLedgerMember(ledgerId, requesterId);

			const rows = await accounts.findCategoriesInLedger(ledgerId);

			const childrenByParent = new Map<string, AccountRow[]>();
			for (const row of rows) {
				if (row.parent_id === null) continue;

				const siblings = childrenByParent.get(row.parent_id) ?? [];
				siblings.push(row);
				childrenByParent.set(row.parent_id, siblings);
			}

			return rows
				.filter((row) => row.parent_id === null)
				.filter((row) => kind === undefined || row.nature === natureOf(kind))
				.map((root) =>
					toNode(
						root,
						(childrenByParent.get(root.id) ?? []).map((child) => toNode(child, [])),
					),
				);
		},

		create: async (ledgerId, request, requesterId) => {
			await access.requireLedgerMember(ledgerId, requesterId);

			if (!request.parentId) {
				const sortOrder = (await accounts.countRootCategories(ledgerId)) * SORT_STEP;
				const created = await accounts.insertCategory({
					ledgerId,
					parentId: null,
					name: request.name,
					nature: natureOf(request.kind),
					sortOrder,
					actorId: requesterId,
				});

				return toNode(created, []);
			}

			const parent = await requireCategory(request.parentId);

			if (parent.ledger_id !== ledgerId) {
				throw new ValidationError("CATEGORY_LEDGER_MISMATCH");
			}
			if (parent.parent_id !== null) {
				throw new ValidationError("CATEGORY_DEPTH_EXCEEDED");
			}
			if (await scopes.hasAnyLine(parent.id)) {
				throw new ConflictError("CATEGORY_HAS_TRANSACTIONS");
			}
			if (parent.nature !== natureOf(request.kind)) {
				throw new ValidationError("CATEGORY_KIND_MISMATCH");
			}

			const sortOrder = (await accounts.countChildren(parent.id)) * SORT_STEP;
			const created = await accounts.insertCategory({
				ledgerId,
				parentId: parent.id,
				name: request.name,
				nature: natureOf(request.kind),
				sortOrder,
				actorId: requesterId,
			});

			return toNode(created, []);
		},

		update: async (categoryId, request, requesterId) => {
			const target = await requireCategory(categoryId);
			await access.requireLedgerMember(target.ledger_id!, requesterId);

			const changes: { name?: string; sortOrder?: number } = {};
			if (request.name !== null && request.name !== undefined) changes.name = request.name;
			if (request.sortOrder !== null && request.sortOrder !== undefined) {
				changes.sortOrder = request.sortOrder;
			}

			const updated = await accounts.updateCategory(categoryId, changes, requesterId);
			if (!updated) throw new NotFoundError("CATEGORY_NOT_FOUND");

			const children = await accounts.findChildren(categoryId);

			return toNode(
				updated,
				children.map((child) => toNode(child, [])),
			);
		},

		remove: async (categoryId, requesterId) => {
			const target = await requireCategory(categoryId);
			await access.requireLedgerMember(target.ledger_id!, requesterId);

			if (await accounts.hasChildren(categoryId)) {
				throw new ConflictError("CATEGORY_HAS_CHILDREN");
			}
			if (await scopes.hasAnyLine(categoryId)) {
				throw new ConflictError("CATEGORY_HAS_TRANSACTIONS");
			}

			await accounts.softDelete(categoryId, requesterId);
		},
	};
}
