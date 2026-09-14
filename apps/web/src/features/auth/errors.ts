import type { MessageKey } from "@/lib/i18n/messages/en";
import type { Translate } from "@/lib/i18n/dictionary";

const KNOWN = new Set<string>([
	"NotAuthorizedException",
	"UserNotFoundException",
	"UserNotConfirmedException",
	"UsernameExistsException",
	"InvalidPasswordException",
	"InvalidParameterException",
	"CodeMismatchException",
	"ExpiredCodeException",
	"LimitExceededException",
	"TooManyRequestsException",
	"TooManyFailedAttemptsException",
	"PasswordResetRequiredException",
	"NetworkError",
]);

export function cognitoMessage(t: Translate, error: unknown): string {
	const name = error instanceof Error ? error.name : "";
	return KNOWN.has(name) ? t(`cognito.${name}` as MessageKey) : t("common.genericError");
}

export function isName(error: unknown, ...names: string[]): boolean {
	return error instanceof Error && names.includes(error.name);
}
