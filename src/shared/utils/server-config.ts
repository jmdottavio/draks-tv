// Default port (used as fallback when PORT env var is not set)
const DEFAULT_PORT = 9442;

// App configuration
const APP_PORT = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const APP_HOST = process.env.APP_HOST ?? "localhost";
const APP_PROTOCOL = process.env.APP_PROTOCOL ?? "http";

// Auth paths
const AUTH_CALLBACK_PATH = "/api/auth/callback";

// Derived URLs
function getAppBaseUrl() {
	return `${APP_PROTOCOL}://${APP_HOST}:${APP_PORT}`;
}

function getAuthRedirectUri() {
	return `${getAppBaseUrl()}${AUTH_CALLBACK_PATH}`;
}

export {
	DEFAULT_PORT,
	APP_PORT,
	APP_HOST,
	APP_PROTOCOL,
	AUTH_CALLBACK_PATH,
	getAppBaseUrl,
	getAuthRedirectUri,
};
