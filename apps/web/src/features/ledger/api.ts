import { api } from "@/lib/api/client";
import type {
	LedgerCreateRequest, LedgerDetail, LedgerInviteAcceptResponse, LedgerInviteRequest,
	LedgerInviteResponse, LedgerMemberDetail, LedgerUpdateRequest,
} from "@/lib/api/types";

export function listLedgers(): Promise<LedgerDetail[]> {
	return api.get<LedgerDetail[]>("ledgers");
}

export function getLedger(id: string): Promise<LedgerDetail> {
	return api.get<LedgerDetail>(`ledgers/${id}`);
}

export function createLedger(body: LedgerCreateRequest): Promise<LedgerDetail> {
	return api.post<LedgerDetail>("ledgers", body);
}

export function updateLedger(id: string, body: LedgerUpdateRequest): Promise<LedgerDetail> {
	return api.patch<LedgerDetail>(`ledgers/${id}`, body);
}

export function deleteLedger(id: string): Promise<void> {
	return api.delete(`ledgers/${id}`);
}

export function listMembers(ledgerId: string): Promise<LedgerMemberDetail[]> {
	return api.get<LedgerMemberDetail[]>(`ledgers/${ledgerId}/members`);
}

export function removeMember(ledgerId: string, userId: string): Promise<void> {
	return api.delete(`ledgers/${ledgerId}/members/${userId}`);
}

export function listInvites(ledgerId: string): Promise<LedgerInviteResponse[]> {
	return api.get<LedgerInviteResponse[]>(`ledgers/${ledgerId}/invites`);
}

export function createInvite(ledgerId: string, body?: LedgerInviteRequest): Promise<LedgerInviteResponse> {
	return api.post<LedgerInviteResponse>(`ledgers/${ledgerId}/invites`, body ?? {});
}

export function revokeInvite(ledgerId: string, inviteId: string): Promise<void> {
	return api.delete(`ledgers/${ledgerId}/invites/${inviteId}`);
}

export function acceptInvite(code: string): Promise<LedgerInviteAcceptResponse> {
	return api.post<LedgerInviteAcceptResponse>(`invites/${encodeURIComponent(code.trim())}/accept`);
}
