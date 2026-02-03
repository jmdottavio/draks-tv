import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

export async function openChat(channel: string): Promise<void> {
	const response = await fetch(`/api/chat/${channel}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to open chat");
		throw new Error(message);
	}
}
