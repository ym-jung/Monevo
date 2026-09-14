import type { Context } from "hono";

const FORWARDED_FOR = "x-forwarded-for";

interface LambdaEvent {
	requestContext?: { http?: { sourceIp?: string } };
}

export function firstForwardedAddress(header: string | undefined): string | undefined {
	const first = header?.split(",")[0]?.trim();

	return first && first !== "" ? first : undefined;
}

export function clientIp(c: Context, trusted: boolean): string {
	const forwarded = firstForwardedAddress(c.req.header(FORWARDED_FOR));
	if (trusted && forwarded) return forwarded;

	const event = (c.env as { event?: LambdaEvent } | undefined)?.event;

	return event?.requestContext?.http?.sourceIp ?? "unknown";
}
