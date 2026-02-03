import { useMutation } from "@tanstack/react-query";

import { openChat } from "../api/chat-mutations";
import { watchLive } from "../api/channels-mutations";
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
