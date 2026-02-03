import { spawn } from "child_process";
import { resolve } from "path";

const LOCALAPPDATA = process.env.LOCALAPPDATA ?? "";
const STREAMLINK_PATH = resolve(LOCALAPPDATA, "Programs", "Streamlink", "bin", "streamlink.exe");

function launchStream(url: string) {
	return new Promise<void | Error>((promiseResolve) => {
		try {
			const child = spawn(STREAMLINK_PATH, [url, "best"], {
				detached: true,
				stdio: "ignore",
				windowsHide: true,
			});

			child.once("error", (error) => {
				promiseResolve(new Error(error.message));
			});
			child.once("spawn", () => {
				child.unref();
				promiseResolve();
			});
		} catch (error) {
			if (error instanceof Error) {
				promiseResolve(new Error(error.message));
				return;
			}
			promiseResolve(new Error("Failed to launch stream: unknown error"));
		}
	});
}

export function launchLiveStream(channel: string) {
	const sanitizedChannel = channel.replace(/[^a-zA-Z0-9_]/g, "");
	return launchStream(`twitch.tv/${sanitizedChannel}`);
}

export function launchVod(vodId: string, startTimeSeconds?: number) {
	const sanitizedId = vodId.replace(/[^0-9]/g, "");

	if (!sanitizedId) {
		return Promise.resolve(new Error("Invalid VOD ID"));
	}

	const url = `twitch.tv/videos/${sanitizedId}`;

	// Use --player-passthrough hls to pass the HLS stream directly to VLC
	// This enables proper seeking and duration display for VODs
	const args = [url, "best", "--player-passthrough", "hls"];

	if (startTimeSeconds !== undefined && startTimeSeconds > 0) {
		args.push("--hls-start-offset", startTimeSeconds.toString());
	}

	return new Promise<void | Error>((promiseResolve) => {
		try {
			const child = spawn(STREAMLINK_PATH, args, {
				detached: true,
				stdio: "ignore",
				windowsHide: true,
			});

			child.once("error", (error) => {
				promiseResolve(new Error(error.message));
			});
			child.once("spawn", () => {
				child.unref();
				promiseResolve();
			});
		} catch (error) {
			if (error instanceof Error) {
				promiseResolve(new Error(error.message));
				return;
			}
			promiseResolve(new Error("Failed to launch stream: unknown error"));
		}
	});
}
