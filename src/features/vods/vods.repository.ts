import { sql } from "drizzle-orm";

import { database } from "@/src/db";
import { vods } from "@/src/db/schema";
import { parseDurationToSeconds } from "@/src/shared/utils/format";

import type { TwitchVideo } from "@/src/services/twitch-service";

export function upsertVodsFromTwitch(videos: Array<TwitchVideo>) {
	try {
		if (videos.length === 0) {
			return null;
		}

		database.transaction((transaction) => {
			for (const video of videos) {
				const durationSeconds = parseDurationToSeconds(video.duration) ?? 0;

				transaction
					.insert(vods)
					.values({
						vodId: video.id,
						channelId: video.user_id,
						title: video.title,
						durationSeconds,
						createdAt: video.created_at,
						thumbnailUrl: video.thumbnail_url,
						fetchedAt: sql`CURRENT_TIMESTAMP`,
					})
					.onConflictDoUpdate({
						target: vods.vodId,
						set: {
							title: video.title,
							durationSeconds,
							createdAt: video.created_at,
							thumbnailUrl: video.thumbnail_url,
							fetchedAt: sql`CURRENT_TIMESTAMP`,
						},
					})
					.run();
			}
		});

		return null;
	} catch (error) {
		console.error("[vods.repository] upsertVodsFromTwitch failed:", error);
		return new Error("Failed to upsert VODs");
	}
}
