import { execFile } from "child_process";
import { resolve } from "path";

const LOCALAPPDATA = process.env.LOCALAPPDATA ?? "";
const STREAMLINK_PATH = resolve(LOCALAPPDATA, "Programs", "Streamlink", "bin", "streamlink.exe");

function launchStream(url: string) {
	return new Promise<void | Error>((promiseResolve) => {
		execFile(STREAMLINK_PATH, [url, "best"], (error) => {
			if (error) {
				promiseResolve(new Error(error.message));
				return;
			}
			promiseResolve();
		});
	});
}

function launchStreamWithPlayerArgs(url: string, playerArgs: string) {
	return new Promise<void | Error>((promiseResolve) => {
		execFile(STREAMLINK_PATH, [url, "best", "--player-args", playerArgs], (error) => {
			if (error) {
				promiseResolve(new Error(error.message));
				return;
			}
			promiseResolve();
		});
	});
}

function launchLiveStream(channel: string) {
	const sanitizedChannel = channel.replace(/[^a-zA-Z0-9_]/g, "");
	return launchStream(`twitch.tv/${sanitizedChannel}`);
}

function launchVod(vodId: string, startTimeSeconds?: number) {
	const sanitizedId = vodId.replace(/[^0-9]/g, "");
	const url = `twitch.tv/videos/${sanitizedId}`;

	// Use --player-passthrough hls to pass the HLS stream directly to VLC
	// This enables proper seeking and duration display for VODs
	const args = [url, "best", "--player-passthrough", "hls"];

	if (startTimeSeconds !== undefined && startTimeSeconds > 0) {
		args.push("--hls-start-offset", startTimeSeconds.toString());
	}

	return new Promise<void | Error>((promiseResolve) => {
		execFile(STREAMLINK_PATH, args, (error) => {
			if (error) {
				promiseResolve(new Error(error.message));
				return;
			}
			promiseResolve();
		});
	});
}

export { launchLiveStream, launchVod };
