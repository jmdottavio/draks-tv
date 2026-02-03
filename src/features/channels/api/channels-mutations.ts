import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";
import { JSON_HEADERS } from "@/src/shared/utils/http";

export async function toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
	const response = await fetch(`/api/favorites/toggle/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to toggle favorite");
		throw new Error(message);
	}

	return response.json() as Promise<{ isFavorite: boolean }>;
}

export async function reorderFavoritesApi(orderedIds: Array<string>): Promise<void> {
	const response = await fetch("/api/favorites/reorder", {
		method: "PUT",
		headers: JSON_HEADERS,
		body: JSON.stringify({ orderedIds }),
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to reorder favorites");
		throw new Error(message);
	}
}

export async function watchLive(channel: string): Promise<void> {
	const response = await fetch(`/api/watch/live/${channel}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch stream");
		throw new Error(message);
	}
}
