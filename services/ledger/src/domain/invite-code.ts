import { randomInt } from "node:crypto";

export const CHAR_POOL = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 8;
export const MAX_CODE_ATTEMPTS = 10;

export const DEFAULT_EXPIRATION_DAYS = 7;
export const DEFAULT_MAX_USES = 1;

export function normalizeCode(code: string | undefined | null): string {
	return (code ?? "").trim().toUpperCase();
}

export function randomCode(): string {
	let code = "";
	for (let i = 0; i < CODE_LENGTH; i++) {
		code += CHAR_POOL[randomInt(CHAR_POOL.length)];
	}
	return code;
}

export function expiresAt(from: Date, days: number): Date {
	return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
