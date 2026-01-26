// Common HTTP headers
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" } as const;

function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded !== null) {
		const firstIp = forwarded.split(",")[0];
		if (firstIp !== undefined) {
			return firstIp.trim();
		}
	}
	return "unknown";
}

export { JSON_HEADERS, FORM_HEADERS, getClientIp };
