// Default port (used as fallback when PORT env var is not set)
const DEFAULT_PORT = 9447;

// Valid protocols for app configuration
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
	// Validate hostname format: alphanumeric, dots, hyphens only
	if (/^[a-zA-Z0-9.-]+$/.test(hostString)) {
		return hostString;
	}
	return "localhost";
}

// App configuration - validated at module load time
const APP_PORT = parsePort(process.env.PORT, DEFAULT_PORT);
const APP_HOST = parseHost(process.env.APP_HOST);
const APP_PROTOCOL = parseProtocol(process.env.APP_PROTOCOL);

// Auth paths
const AUTH_CALLBACK_PATH = "/api/auth/callback";

// Pre-computed URLs for efficiency
const APP_BASE_URL = `${APP_PROTOCOL}://${APP_HOST}:${APP_PORT}`;
const AUTH_REDIRECT_URI = `${APP_BASE_URL}${AUTH_CALLBACK_PATH}`;

function getAppBaseUrl() {
	return APP_BASE_URL;
}

function getAuthRedirectUri() {
	return AUTH_REDIRECT_URI;
}

export {
	APP_HOST,
	APP_PORT,
	APP_PROTOCOL,
	AUTH_CALLBACK_PATH,
	DEFAULT_PORT,
	getAppBaseUrl,
	getAuthRedirectUri,
};
