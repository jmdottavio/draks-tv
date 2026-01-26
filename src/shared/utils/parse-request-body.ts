import { createErrorResponse, ErrorCode } from "./api-errors";

export async function parseRequestBody<T>(
	request: Request,
	validator: (data: unknown) => T | Error,
): Promise<T | Response> {
	let rawBody: unknown;

	try {
		rawBody = await request.json();
	} catch {
		return createErrorResponse(
			"Invalid JSON in request body",
			ErrorCode.PARSE_ERROR,
			400,
		);
	}

	const validated = validator(rawBody);

	if (validated instanceof Error) {
		return createErrorResponse(
			validated.message,
			ErrorCode.INVALID_INPUT,
			400,
		);
	}

	return validated;
}
