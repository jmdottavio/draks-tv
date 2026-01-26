const SECURITY_HEADERS = {
	"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://static-cdn.jtvnw.net data:; connect-src 'self'",
	"X-Frame-Options": "DENY",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

function getSecurityHeaders(): Record<string, string> {
	return { ...SECURITY_HEADERS };
}

function applySecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);

	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export { getSecurityHeaders, applySecurityHeaders, SECURITY_HEADERS };
