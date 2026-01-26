import { exec } from "child_process";
import { resolve } from "path";

const LOCALAPPDATA = process.env.LOCALAPPDATA ?? "";
const STREAMLINK_PATH = resolve(LOCALAPPDATA, "Programs", "Streamlink", "bin", "streamlink.exe");

function launchStream(url: string): Promise<void | Error> {
	return new Promise((resolve) => {
		exec(`"${STREAMLINK_PATH}" ${url} best`, (error) => {
			if (error) {
				resolve(new Error(error.message));
				return;
			}
			resolve();
		});
	});
}

function launchLiveStream(channel: string): Promise<void | Error> {
	const sanitizedChannel = channel.replace(/[^a-zA-Z0-9_]/g, "");
	return launchStream(`twitch.tv/${sanitizedChannel}`);
}

function launchVod(vodId: string): Promise<void | Error> {
	const sanitizedId = vodId.replace(/[^0-9]/g, "");
	return launchStream(`twitch.tv/videos/${sanitizedId}`);
}

export { launchLiveStream, launchVod };
