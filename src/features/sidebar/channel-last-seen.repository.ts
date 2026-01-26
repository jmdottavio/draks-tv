import { sql } from "drizzle-orm";

import { database } from "@/src/db";
import { channelLastSeen } from "@/src/db/schema";

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

type ChannelLastSeenInput = {
	twitchId: string;
	login: string;
	displayName: string;
	lastSeenAt: string;
};

function setLastSeenDate(channel: ChannelLastSeenInput) {
	try {
		database
			.insert(channelLastSeen)
			.values({
				twitchId: channel.twitchId,
				login: channel.login,
				displayName: channel.displayName,
				lastSeenAt: channel.lastSeenAt,
			})
			.onConflictDoUpdate({
				target: channelLastSeen.twitchId,
				set: {
					login: channel.login,
					displayName: channel.displayName,
					lastSeenAt: channel.lastSeenAt,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				},
			})
			.run();

		return null;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to set last seen date: ${message}`);
	}
}

export { getAllLastSeenDates, setLastSeenDate };
