export function formatViewers(count: number | undefined | null): string {
	if (count === undefined || count === null) {
		return "0";
	}

	if (count >= 1_000_000) {
		return (count / 1_000_000).toFixed(1) + "M";
	}

	if (count >= 1_000) {
		return (count / 1_000).toFixed(1) + "K";
	}

	return count.toString();
}

export function formatDuration(duration: string): string {
	const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);

	if (match === null) {
		return duration;
	}

	const hours = match[1] ?? "0";
	const minutes = match[2] ?? "0";

	if (Number(hours) > 0) {
		return `${hours}h ${minutes}m`;
	}

	return `${minutes}m`;
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return "Unknown";
	}

	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days < 0) return "Today";
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} weeks ago`;

	return date.toLocaleDateString();
}

export function formatThumbnail(url: string, width: number, height: number): string {
	// Handle various Twitch thumbnail URL formats:
	// - Streams: {width}x{height}
	// - VODs: %{width}x%{height}
	// IMPORTANT: Replace longer patterns first (%{width} before {width})
	// otherwise {width} gets replaced and leaves the % behind
	const formattedUrl = url
		.replace(/%{width}/gi, width.toString())
		.replace(/%{height}/gi, height.toString())
		.replace(/{width}/gi, width.toString())
		.replace(/{height}/gi, height.toString());

	// Add cache-busting timestamp that changes every 30 seconds
	const cacheBuster = Math.floor(Date.now() / 30_000);
	const separator = formattedUrl.includes("?") ? "&" : "?";

	return `${formattedUrl}${separator}t=${cacheBuster}`;
}

export function formatSecondsToTime(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}

	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseTimeToSeconds(timeString: string): number | null {
	const splitParts = timeString.split(":");
	const parts = splitParts.map((part) => parseInt(part, 10));

	if (parts.some((part) => Number.isNaN(part) || part < 0)) {
		return null;
	}

	if (parts.length === 3) {
		const hours = parts[0];
		const minutes = parts[1];
		const seconds = parts[2];
		if (hours === undefined || minutes === undefined || seconds === undefined) {
			return null;
		}
		return hours * 3600 + minutes * 60 + seconds;
	}

	if (parts.length === 2) {
		const minutes = parts[0];
		const seconds = parts[1];
		if (minutes === undefined || seconds === undefined) {
			return null;
		}
		return minutes * 60 + seconds;
	}

	if (parts.length === 1) {
		const seconds = parts[0];
		if (seconds === undefined) {
			return null;
		}
		return seconds;
	}

	return null;
}

export function parseDurationToSeconds(duration: string): number | null {
	const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);

	if (match === null) {
		return null;
	}

	const hours = parseInt(match[1] ?? "0", 10);
	const minutes = parseInt(match[2] ?? "0", 10);
	const seconds = parseInt(match[3] ?? "0", 10);

	return hours * 3600 + minutes * 60 + seconds;
}
