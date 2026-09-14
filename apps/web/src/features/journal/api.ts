import { api } from "@/lib/api/client";
import type {
	JournalEntryCreateRequest, JournalEntryDetail, JournalEntryListQuery, JournalEntrySummary,
	JournalEntryUpdateRequest, PageResponse,
} from "@/lib/api/types";

export const PAGE_SIZE = 50;

export function listEntries(query: JournalEntryListQuery): Promise<PageResponse<JournalEntrySummary>> {
	return api.get<PageResponse<JournalEntrySummary>>("journal-entries", {
		query: { size: PAGE_SIZE, ...query },
	});
}

export function getEntry(id: string): Promise<JournalEntryDetail> {
	return api.get<JournalEntryDetail>(`journal-entries/${id}`);
}

export function createEntry(body: JournalEntryCreateRequest): Promise<JournalEntryDetail> {
	return api.post<JournalEntryDetail>("journal-entries", body);
}

export function updateEntry(id: string, body: JournalEntryUpdateRequest): Promise<JournalEntryDetail> {
	return api.patch<JournalEntryDetail>(`journal-entries/${id}`, body);
}

export function deleteEntry(id: string): Promise<void> {
	return api.delete(`journal-entries/${id}`);
}
