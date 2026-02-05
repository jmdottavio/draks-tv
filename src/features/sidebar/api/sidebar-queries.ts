import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import { isSidebarChannelArray } from "@/src/features/sidebar/sidebar.validators";

export async function fetchFollowedChannels() {
	const response = await fetch("/api/channels/followed");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch followed channels");
		throw new Error(message);
	}

	const data: unknown = await response.json();
	if (!isSidebarChannelArray(data)) {
		throw new Error("Invalid followed channels payload");
	}

	return data;
}
