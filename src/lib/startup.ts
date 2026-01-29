import { populateInitialCache, startBackgroundRefresh } from "@/src/services/video-cache-service";

async function initializeVideoCache() {
	console.log("[startup] Starting video cache initialization...");
	const startTime = Date.now();

	// Populate cache - this runs to completion or logs warnings on failure
	const result = await populateInitialCache();

	if (result instanceof Error) {
		console.warn(`[startup] Cache initialization had errors: ${result.message}`);
	} else {
		console.log(`[startup] Cache initialized in ${Date.now() - startTime}ms`);
	}

	// Start background refresh even if populateInitialCache had errors
	startBackgroundRefresh();
}

export { initializeVideoCache };
