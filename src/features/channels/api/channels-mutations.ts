import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";
import { JSON_HEADERS } from "@/src/shared/utils/http";
import { isRecord } from "@/src/shared/utils/validation";

export async function toggleFavorite(id: string) {
	const response = await fetch(`/api/favorites/toggle/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to toggle favorite");
		throw new Error(message);
	}

	const data: unknown = await response.json();
	if (!isRecord(data) || typeof data.isFavorite !== "boolean") {
		throw new Error("Invalid toggle favorite payload");
	}

	return { isFavorite: data.isFavorite };
}

export async function reorderFavoritesApi(orderedIds: Array<string>) {
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

export async function watchLive(channel: string) {
	const response = await fetch(`/api/watch/live/${channel}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch stream");
		throw new Error(message);
	}
}
