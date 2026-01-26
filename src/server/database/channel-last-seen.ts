import { db } from "./schema";

interface ChannelLastSeenRow {
	twitch_id: string;
	login: string;
	display_name: string;
	last_seen_at: string;
	updated_at: string | null;
}

interface ChannelInput {
	id: string;
	login: string;
	displayName: string;
}

interface ChannelInputWithVodDate extends ChannelInput {
	vodDate: string;
}

function getLastSeenDate(twitchId: string): string | null {
	const row = db
		.query<ChannelLastSeenRow, [string]>(
			"SELECT last_seen_at FROM channel_last_seen WHERE twitch_id = ?",
		)
		.get(twitchId);

	if (row === undefined || row === null) {
		return null;
	}

	return row.last_seen_at;
}

function getAllLastSeenDates(): Map<string, string> {
	const rows = db
		.query<ChannelLastSeenRow, []>("SELECT twitch_id, last_seen_at FROM channel_last_seen")
		.all();

	const dateMap = new Map<string, string>();

	for (const row of rows) {
		dateMap.set(row.twitch_id, row.last_seen_at);
	}

	return dateMap;
}

function updateLastSeenToNow(twitchId: string, login: string, displayName: string): void {
	db.run(
		`INSERT INTO channel_last_seen (twitch_id, login, display_name, last_seen_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(twitch_id) DO UPDATE SET
       login = excluded.login,
       display_name = excluded.display_name,
       last_seen_at = datetime('now'),
       updated_at = datetime('now')`,
		[twitchId, login, displayName],
	);
}

function setLastSeenFromVod(
	twitchId: string,
	login: string,
	displayName: string,
	vodDate: string,
): void {
	db.run(
		`INSERT INTO channel_last_seen (twitch_id, login, display_name, last_seen_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(twitch_id) DO UPDATE SET
       login = excluded.login,
       display_name = excluded.display_name,
       last_seen_at = CASE
         WHEN excluded.last_seen_at > channel_last_seen.last_seen_at THEN excluded.last_seen_at
         ELSE channel_last_seen.last_seen_at
       END,
       updated_at = datetime('now')`,
		[twitchId, login, displayName, vodDate],
	);
}

function batchUpdateLastSeenToNow(channels: Array<ChannelInput>): void {
	const transaction = db.transaction(() => {
		for (const channel of channels) {
			db.run(
				`INSERT INTO channel_last_seen (twitch_id, login, display_name, last_seen_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(twitch_id) DO UPDATE SET
           login = excluded.login,
           display_name = excluded.display_name,
           last_seen_at = datetime('now'),
           updated_at = datetime('now')`,
				[channel.id, channel.login, channel.displayName],
			);
		}
	});

	transaction();
}

function batchSetLastSeenFromVod(channels: Array<ChannelInputWithVodDate>): void {
	const transaction = db.transaction(() => {
		for (const channel of channels) {
			db.run(
				`INSERT INTO channel_last_seen (twitch_id, login, display_name, last_seen_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(twitch_id) DO UPDATE SET
           login = excluded.login,
           display_name = excluded.display_name,
           last_seen_at = CASE
             WHEN excluded.last_seen_at > channel_last_seen.last_seen_at THEN excluded.last_seen_at
             ELSE channel_last_seen.last_seen_at
           END,
           updated_at = datetime('now')`,
				[channel.id, channel.login, channel.displayName, channel.vodDate],
			);
		}
	});

	transaction();
}

export {
	getLastSeenDate,
	getAllLastSeenDates,
	updateLastSeenToNow,
	setLastSeenFromVod,
	batchUpdateLastSeenToNow,
	batchSetLastSeenFromVod,
};
export type { ChannelLastSeenRow, ChannelInput, ChannelInputWithVodDate };
