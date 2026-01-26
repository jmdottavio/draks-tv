export enum ErrorCode {
	INVALID_INPUT = "INVALID_INPUT",
	NOT_FOUND = "NOT_FOUND",
	UNAUTHORIZED = "UNAUTHORIZED",
	FORBIDDEN = "FORBIDDEN",
	INTERNAL_ERROR = "INTERNAL_ERROR",
	DATABASE_ERROR = "DATABASE_ERROR",
	PARSE_ERROR = "PARSE_ERROR",
	TWITCH_API_ERROR = "TWITCH_API_ERROR",
	STREAMLINK_ERROR = "STREAMLINK_ERROR",
	CONFIG_ERROR = "CONFIG_ERROR",
}

type ErrorResponse = {
	error: {
		message: string;
		code: ErrorCode;
		details?: Record<string, unknown>;
	};
};

export function createErrorResponse(
	message: string,
	code: ErrorCode,
	status: number,
	details: Record<string, unknown> = {},
): Response {
	return Response.json(
		{
			error: {
				message,
				code,
				details,
			},
		} satisfies ErrorResponse,
		{ status },
	);
}

/**
 * Extracts error message from API error response with proper type narrowing.
 * Use this client-side when handling fetch errors.
 * Handles JSON parsing internally.
 */
export async function extractApiErrorMessage(response: Response, fallback: string): Promise<string> {
	const data: unknown = await response.json().catch(() => null);
	if (data !== null && typeof data === "object" && "error" in data) {
		const errorObj = (data as { error?: { message?: string } }).error;
		if (typeof errorObj?.message === "string") {
			return errorObj.message;
		}
	}
	return fallback;
}
