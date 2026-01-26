import { sql } from "drizzle-orm";

import { database } from "@/src/db";
import { channelLastSeen } from "@/src/db/schema";

interface ChannelInput {
	id: string;
	login: string;
	displayName: string;
}

interface ChannelInputWithVodDate extends ChannelInput {
	vodDate: string;
}

function getAllLastSeenDates() {
	try {
		const rows = database
			.select({
				twitchId: channelLastSeen.twitchId,
				lastSeenAt: channelLastSeen.lastSeenAt,
			})
			.from(channelLastSeen)
			.all();

		const dateMap = new Map<string, string>();

		for (const row of rows) {
			dateMap.set(row.twitchId, row.lastSeenAt);
		}

		return dateMap;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to get all last seen dates: ${message}`);
	}
}

function batchUpdateLastSeenToNow(channels: Array<ChannelInput>) {
	try {
		database.transaction((transaction) => {
			for (const channel of channels) {
				transaction
					.insert(channelLastSeen)
					.values({
						twitchId: channel.id,
						login: channel.login,
						displayName: channel.displayName,
						lastSeenAt: sql`datetime('now')`,
						updatedAt: sql`datetime('now')`,
					})
					.onConflictDoUpdate({
						target: channelLastSeen.twitchId,
						set: {
							login: channel.login,
							displayName: channel.displayName,
							lastSeenAt: sql`datetime('now')`,
							updatedAt: sql`datetime('now')`,
						},
					})
					.run();
			}
		});

		return null;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to batch update last seen: ${message}`);
	}
}

function batchSetLastSeenFromVod(channels: Array<ChannelInputWithVodDate>) {
	try {
		database.transaction((transaction) => {
			for (const channel of channels) {
				transaction
					.insert(channelLastSeen)
					.values({
						twitchId: channel.id,
						login: channel.login,
						displayName: channel.displayName,
						lastSeenAt: channel.vodDate,
						updatedAt: sql`datetime('now')`,
					})
					.onConflictDoUpdate({
						target: channelLastSeen.twitchId,
						set: {
							login: channel.login,
							displayName: channel.displayName,
							lastSeenAt: sql`CASE WHEN excluded.last_seen_at > ${channelLastSeen.lastSeenAt} THEN excluded.last_seen_at ELSE ${channelLastSeen.lastSeenAt} END`,
							updatedAt: sql`datetime('now')`,
						},
					})
					.run();
			}
		});

		return null;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to batch set last seen from VOD: ${message}`);
	}
}

export { getAllLastSeenDates, batchUpdateLastSeenToNow, batchSetLastSeenFromVod };
export type { ChannelInput, ChannelInputWithVodDate };
