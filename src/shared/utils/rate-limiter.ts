import { JSON_HEADERS } from "./http";

type RateLimitConfig = {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Max requests per window
};

type RequestRecord = {
	timestamps: Array<number>;
};

const requestRecords = new Map<string, RequestRecord>();

// Clean up old entries periodically
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
		return;
	}
	lastCleanup = now;

	const cutoff = now - windowMs;
	for (const [key, record] of requestRecords) {
		record.timestamps = record.timestamps.filter((t) => t > cutoff);
		if (record.timestamps.length === 0) {
			requestRecords.delete(key);
		}
	}
}

function checkRateLimit(
	identifier: string,
	config: RateLimitConfig,
): { allowed: boolean; retryAfterMs?: number } {
	const now = Date.now();
	cleanup(config.windowMs);

	let record = requestRecords.get(identifier);
	if (record === undefined) {
		record = { timestamps: [] };
		requestRecords.set(identifier, record);
	}

	// Remove timestamps outside the window
	const cutoff = now - config.windowMs;
	record.timestamps = record.timestamps.filter((t) => t > cutoff);

	if (record.timestamps.length >= config.maxRequests) {
		const oldestInWindow = record.timestamps[0] ?? now;
		const retryAfterMs = oldestInWindow + config.windowMs - now;
		return { allowed: false, retryAfterMs };
	}

	record.timestamps.push(now);
	return { allowed: true };
}

// Pre-configured rate limiters
const AUTH_RATE_LIMIT: RateLimitConfig = {
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 10, // 10 requests per minute for auth endpoints
};

function checkAuthRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
	return checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
}

function createRateLimitResponse(retryAfterMs?: number): Response {
	return new Response(JSON.stringify({ error: "Too many requests" }), {
		status: 429,
		headers: {
			...JSON_HEADERS,
			"Retry-After": String(Math.ceil((retryAfterMs ?? 60000) / 1000)),
		},
	});
}

export { checkAuthRateLimit, createRateLimitResponse };
