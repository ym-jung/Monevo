export { errorCodeStatus, statusOf } from "./error-code.ts";
export type { ErrorCode } from "./error-code.ts";

export { fail, ok, page } from "./envelope.ts";
export type { ApiFailure, ApiSuccess, ErrorBody, ErrorDetail, PageResponse } from "./envelope.ts";

export {
	BusinessError,
	ConflictError,
	ForbiddenError,
	GoneError,
	isBusinessError,
	NotFoundError,
	ValidationError,
} from "./errors.ts";

export { isLocale, LOCALES, localeFromAcceptLanguage, messageFor } from "./messages/index.ts";
export type { Locale } from "./messages/index.ts";

export { errorHandler, GATEWAY_HEADER, gateway, notFoundFor, requestId, requestIdOf } from "./hono.ts";
export type { RequestVariables } from "./hono.ts";
