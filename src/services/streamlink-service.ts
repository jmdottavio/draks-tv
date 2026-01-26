import { exec } from "child_process";
import { resolve } from "path";

const LOCALAPPDATA = process.env.LOCALAPPDATA ?? "";
const STREAMLINK_PATH = resolve(LOCALAPPDATA, "Programs", "Streamlink", "bin", "streamlink.exe");

function launchStream(url: string) {
	return new Promise<void | Error>((promiseResolve) => {
		exec(`"${STREAMLINK_PATH}" ${url} best`, (error) => {
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

function launchVod(vodId: string) {
	const sanitizedId = vodId.replace(/[^0-9]/g, "");
	return launchStream(`twitch.tv/videos/${sanitizedId}`);
}

export { launchLiveStream, launchVod };
