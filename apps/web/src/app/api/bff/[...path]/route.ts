import {randomUUID} from "node:crypto";

import {type NextRequest, NextResponse} from "next/server";

import {currentAccessToken} from "@/lib/amplify/server";
import {serviceFor} from "@/lib/api/upstream";
import {gatewaySecret, upstreamUrl} from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "x-client-version", "x-forwarded-for"];

const FORWARD_RESPONSE_HEADERS = [
    "content-type",
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "retry-after",
];

const LOCALE_COOKIE = "okg-locale";

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const {path} = await ctx.params;

    const target = new URL(`/api/v1/${path.join("/")}`, upstreamUrl(serviceFor(path)));
    target.search = request.nextUrl.search;

    const headers = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }

    headers.set("x-request-id", request.headers.get("x-request-id") ?? randomUUID());

    const locale = request.cookies.get(LOCALE_COOKIE)?.value;
    const acceptLanguage = locale ?? request.headers.get("accept-language");
    if (acceptLanguage) headers.set("accept-language", acceptLanguage);

    const secret = gatewaySecret();
    if (secret) headers.set("x-monevo-gateway", secret);

    const token = await currentAccessToken();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const hasBody = request.method !== "GET" && request.method !== "HEAD";

    let upstream: Response;
    try {
        upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? await request.arrayBuffer() : undefined,
            cache: "no-store",
            redirect: "manual",
        });
    } catch {

        return NextResponse.json(
            {
                error: {
                    code: "BACKEND_UNREACHABLE",
                    message: "BACKEND_UNREACHABLE",
                    details: [],
                    traceId: headers.get("x-request-id") ?? "",
                    timestamp: new Date().toISOString(),
                },
            },
            {status: 503},
        );
    }

    const responseHeaders = new Headers();
    for (const name of FORWARD_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
    }

    if (upstream.status === 204) {
        return new NextResponse(null, {status: 204, headers: responseHeaders});
    }

    return new NextResponse(upstream.body, {status: upstream.status, headers: responseHeaders});
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
