import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { SidebarChannel } from "../sidebar.types";

export async function fetchFollowedChannels(): Promise<Array<SidebarChannel>> {
	const response = await fetch("/api/channels/followed");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch followed channels");
		throw new Error(message);
	}

	return response.json() as Promise<Array<SidebarChannel>>;
}
