const EMAIL = /([a-zA-Z0-9])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export function maskEmails(input: string): string {
	return input.replace(EMAIL, "$1***$2");
}

export function maskDestination(email: string): string | null {
	const at = email.indexOf("@");
	const lastDot = email.lastIndexOf(".");
	if (at <= 0 || lastDot <= at + 1) return null;

	return `${email[0]}***@${email[at + 1]}***${email.slice(lastDot)}`;
}
