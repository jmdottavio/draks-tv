import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

async function watchVod(id: string): Promise<void> {
	const response = await fetch(`/api/watch/vod/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch VOD");
		throw new Error(message);
	}
}

export { watchVod };
