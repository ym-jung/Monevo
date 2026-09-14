import { api } from "@/lib/api/client";
import type { CategoryCreateRequest, CategoryKind, CategoryNode, CategoryUpdateRequest } from "@/lib/api/types";

export function listCategories(ledgerId: string, kind?: CategoryKind): Promise<CategoryNode[]> {
	return api.get<CategoryNode[]>(`ledgers/${ledgerId}/categories`, { query: { kind } });
}

export function createCategory(ledgerId: string, body: CategoryCreateRequest): Promise<CategoryNode> {
	return api.post<CategoryNode>(`ledgers/${ledgerId}/categories`, body);
}

export function updateCategory(id: string, body: CategoryUpdateRequest): Promise<CategoryNode> {
	return api.patch<CategoryNode>(`categories/${id}`, body);
}

export function deleteCategory(id: string): Promise<void> {
	return api.delete(`categories/${id}`);
}

export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
	return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}
