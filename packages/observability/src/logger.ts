import { maskEmails } from "./masking.ts";

export type Level = "debug" | "info" | "warn" | "error";

export interface LogFields {
	[key: string]: unknown;
}

export interface Logger {
	debug(message: string, fields?: LogFields): void;
	info(message: string, fields?: LogFields): void;
	warn(message: string, fields?: LogFields): void;
	error(message: string, fields?: LogFields): void;
	child(fields: LogFields): Logger;
}

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function thresholdFrom(value: string | undefined): Level {
	const candidate = value?.toLowerCase();
	return candidate && candidate in LEVEL_ORDER ? (candidate as Level) : "info";
}

export function createLogger(base: LogFields = {}, level?: Level): Logger {
	const threshold = level ?? thresholdFrom(process.env["LOG_LEVEL"]);

	const emit = (at: Level, message: string, fields?: LogFields): void => {
		if (LEVEL_ORDER[at] < LEVEL_ORDER[threshold]) return;

		const entry = {
			"@timestamp": new Date().toISOString(),
			level: at.toUpperCase(),
			message: maskEmails(message),
			...base,
			...fields,
		};

		process.stdout.write(`${JSON.stringify(entry)}\n`);
	};

	return {
		debug: (message, fields) => emit("debug", message, fields),
		info: (message, fields) => emit("info", message, fields),
		warn: (message, fields) => emit("warn", message, fields),
		error: (message, fields) => emit("error", message, fields),
		child: (fields) => createLogger({ ...base, ...fields }, threshold),
	};
}
