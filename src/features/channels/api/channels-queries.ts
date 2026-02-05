import { isChannelArray } from "@/src/features/channels/channels.validators";
import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

export async function fetchChannels() {
	const response = await fetch("/api/channels");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channels");
		throw new Error(message);
	}

	const data: unknown = await response.json();
	if (!isChannelArray(data)) {
		throw new Error("Invalid channels payload");
	}

	return data;
}
