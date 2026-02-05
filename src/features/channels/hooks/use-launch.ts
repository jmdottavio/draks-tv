import { useMutation } from "@tanstack/react-query";

import { watchLive } from "@/src/features/channels/api/channels-mutations";
import { openChat } from "@/src/features/channels/api/chat-mutations";
import { watchVod } from "@/src/features/vods/api/vods-mutations";

export function useWatchLive() {
	return useMutation({
		mutationFn: watchLive,
	});
}

export function useWatchVod() {
	return useMutation({
		mutationFn: watchVod,
	});
}

export function useOpenChat() {
	return useMutation({
		mutationFn: openChat,
	});
}
