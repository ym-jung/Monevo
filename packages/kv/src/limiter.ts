import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

export interface Decision {
	allowed: boolean;
	limit: number;
	remaining: number;
	retryAfterSeconds: number;
}

export interface RateLimiter {
	hit(key: string, limit: number, windowSeconds: number): Promise<Decision>;
}

export interface LimiterOptions {
	tableName: string;
	client?: DynamoDBClient;
	onError?: (error: unknown) => void;
}

const KEEP_WINDOWS = 2;

export const PARTITION = "ratelimit";

export function createRateLimiter(options: LimiterOptions): RateLimiter {
	const client = options.client ?? new DynamoDBClient({});

	return {
		hit: async (key, limit, windowSeconds) => {
			const seconds = Math.floor(Date.now() / 1000);
			const start = Math.floor(seconds / windowSeconds) * windowSeconds;
			const resetsAt = start + windowSeconds;

			try {
				const result = await client.send(
					new UpdateItemCommand({
						TableName: options.tableName,
						Key: { pk: { S: `${PARTITION}#${key}` }, sk: { S: String(start) } },
						UpdateExpression: "ADD n :one SET expires_at = if_not_exists(expires_at, :ttl)",
						ExpressionAttributeValues: {
							":one": { N: "1" },
							":ttl": { N: String(start + windowSeconds * KEEP_WINDOWS) },
						},
						ReturnValues: "UPDATED_NEW",
					}),
				);

				const count = Number(result.Attributes?.["n"]?.N ?? "1");

				return {
					allowed: count <= limit,
					limit,
					remaining: Math.max(0, limit - count),
					retryAfterSeconds: Math.max(1, resetsAt - seconds),
				};
			} catch (error) {
				options.onError?.(error);

				return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
			}
		},
	};
}
