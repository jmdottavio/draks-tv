import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

async function toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
	const response = await fetch(`/api/favorites/toggle/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to toggle favorite");
		throw new Error(message);
	}

	return response.json() as Promise<{ isFavorite: boolean }>;
}

async function reorderFavoritesApi(orderedIds: Array<string>): Promise<void> {
	const response = await fetch("/api/favorites/reorder", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ orderedIds }),
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to reorder favorites");
		throw new Error(message);
	}
}

async function watchLive(channel: string): Promise<void> {
	const response = await fetch(`/api/watch/live/${channel}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch stream");
		throw new Error(message);
	}
}

export { toggleFavorite, reorderFavoritesApi, watchLive };
