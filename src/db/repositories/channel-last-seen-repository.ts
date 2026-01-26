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

export { getAllLastSeenDates };
