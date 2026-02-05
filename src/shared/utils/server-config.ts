const DEFAULT_PORT = 9446;
const ALLOWED_PROTOCOLS = ["http", "https"];

function parsePort(portString: string | undefined, defaultPort: number) {
	if (portString === undefined) {
		return defaultPort;
	}

	const parsed = parseInt(portString, 10);
	if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
		return defaultPort;
	}

	return parsed;
}

function parseProtocol(protocolString: string | undefined) {
	if (protocolString === undefined) {
		return "http";
	}

	if (ALLOWED_PROTOCOLS.includes(protocolString)) {
		return protocolString;
	}

	return "http";
}

function parseHost(hostString: string | undefined) {
	if (hostString === undefined) {
		return "localhost";
	}

	if (/^[a-zA-Z0-9.-]+$/.test(hostString)) {
		return hostString;
	}

	return "localhost";
}

const APP_PROTOCOL = parseProtocol(process.env.APP_PROTOCOL);
const APP_HOST = parseHost(process.env.APP_HOST);
export const APP_PORT = parsePort(process.env.PORT, DEFAULT_PORT);

const APP_BASE_URL = `${APP_PROTOCOL}://${APP_HOST}:${APP_PORT}`;
const AUTH_CALLBACK_PATH = "/api/auth/callback";
const AUTH_REDIRECT_URI = `${APP_BASE_URL}${AUTH_CALLBACK_PATH}`;

export function getAppBaseUrl() {
	return APP_BASE_URL;
}

export function getAuthRedirectUri() {
	return AUTH_REDIRECT_URI;
}
