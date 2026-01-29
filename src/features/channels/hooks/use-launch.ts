import { useMutation } from "@tanstack/react-query";

import { openChat } from "../api/chat-mutations";
import { watchLive } from "../api/channels-mutations";
import { watchVod } from "@/src/features/vods/api/vods-mutations";

function useWatchLive() {
	return useMutation({
		mutationFn: watchLive,
	});
}

function useWatchVod() {
	return useMutation({
		mutationFn: watchVod,
	});
}

function useOpenChat() {
	return useMutation({
		mutationFn: openChat,
	});
}

export { useOpenChat, useWatchLive, useWatchVod };
