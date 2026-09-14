import type { CategoryKind } from "./enums";

export interface CategoryNode {
	id: string;
	name: string;
	kind: CategoryKind;

	isSystem: boolean;
	sortOrder: number;

	children: CategoryNode[];
}

export interface CategoryCreateRequest {
	name: string;
	kind: CategoryKind;
	parentId?: string;
}

export interface CategoryUpdateRequest {
	name?: string;
	sortOrder?: number;
}
