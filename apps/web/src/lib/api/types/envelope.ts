export interface ApiSuccess<T> {
	data: T;
	meta?: unknown;
}

export interface ErrorDetail {
	field: string;

	issue: string;
	value: string | null;
}

export interface ApiFailure {
	error: {
		code: string;

		message: string;

		details: ErrorDetail[];
		traceId: string;
		timestamp: string;
	};
}

export interface PageResponse<T> {
	items: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
	hasNext: boolean;
}
