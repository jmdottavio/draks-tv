import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { SaveProgressInput } from "../playback-progress.repository";

async function watchVod({
	id,
	startTimeSeconds,
}: {
	id: string;
	startTimeSeconds?: number;
}) {
	const options: RequestInit = { method: "POST" };

	if (startTimeSeconds !== undefined && startTimeSeconds > 0) {
		options.headers = { "Content-Type": "application/json" };
		options.body = JSON.stringify({ startTime: startTimeSeconds });
	}

	const response = await fetch(`/api/watch/vod/${id}`, options);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch VOD");
		throw new Error(message);
	}
}

async function saveVodProgress(data: SaveProgressInput) {
	const response = await fetch("/api/vod-progress", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to save VOD progress");
		throw new Error(message);
	}
}

async function deleteVodProgress(vodId: string) {
	const response = await fetch(`/api/vod-progress/${vodId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to delete VOD progress");
		throw new Error(message);
	}
}

export { deleteVodProgress, saveVodProgress, watchVod };
