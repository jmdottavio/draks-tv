import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { initializeVideoCache } from "./lib/startup";

// Prevent re-initialization on hot reload in development
declare global {
	var __vodCacheInitialized: boolean | undefined;
}

if (!globalThis.__vodCacheInitialized) {
	globalThis.__vodCacheInitialized = true;

	// Start initialization in background - do NOT block requests
	// First requests may have cache misses, which fall back to direct Twitch API calls
	initializeVideoCache().catch((error) => {
		console.error("[startup] Video cache initialization failed:", error);
	});
}

export default createServerEntry({
	fetch(request) {
		return handler.fetch(request);
	},
});
