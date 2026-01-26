import { useQuery } from "@tanstack/react-query";

import { fetchUserByLogin, fetchVideos } from "../lib/api";

function useVodSearch(channelLogin: string | null) {
	return useQuery({
		queryKey: ["vods", channelLogin],
		queryFn: async () => {
			if (channelLogin === null) {
				return null;
			}

			const user = await fetchUserByLogin(channelLogin);

			if (user === null) {
				throw new Error(`Channel "${channelLogin}" not found`);
			}

			const videos = await fetchVideos(user.id);
			return { user, videos };
		},
		enabled: channelLogin !== null,
	});
}

export { useVodSearch };
