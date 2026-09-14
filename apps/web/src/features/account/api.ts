import { api } from "@/lib/api/client";
import type {
	AccountBalanceResponse, AccountCreateRequest, AccountDetail, AccountUpdateRequest,
} from "@/lib/api/types";

export function listAccounts(ledgerId?: string, includeArchived = false): Promise<AccountDetail[]> {
	return api.get<AccountDetail[]>("accounts", { query: { ledgerId, includeArchived } });
}

export function getAccount(id: string): Promise<AccountDetail> {
	return api.get<AccountDetail>(`accounts/${id}`);
}

export function getAccountBalance(id: string): Promise<AccountBalanceResponse> {
	return api.get<AccountBalanceResponse>(`accounts/${id}/balance`);
}

export function createAccount(body: AccountCreateRequest): Promise<AccountDetail> {
	return api.post<AccountDetail>("accounts", body);
}

export function updateAccount(id: string, body: AccountUpdateRequest): Promise<AccountDetail> {
	return api.patch<AccountDetail>(`accounts/${id}`, body);
}

export function linkAccount(id: string, ledgerId: string): Promise<void> {
	return api.put(`accounts/${id}/ledgers/${ledgerId}`);
}

export function unlinkAccount(id: string, ledgerId: string): Promise<void> {
	return api.delete(`accounts/${id}/ledgers/${ledgerId}`);
}

export function deleteAccount(id: string): Promise<void> {
	return api.delete(`accounts/${id}`);
}

export function unsettledMinor(account: AccountDetail): number {
	return account.type === "CREDIT_CARD" && account.balanceMinor < 0 ? -account.balanceMinor : 0;
}
