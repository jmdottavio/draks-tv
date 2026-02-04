import { spawn } from "child_process";
import { existsSync } from "fs";

const CHATTERINO_PATH = "C:\\Program Files\\Chatterino\\chatterino.exe";

export function launchChatterino(channelName: string) {
	return new Promise<void | Error>((promiseResolve) => {
		const sanitizedChannel = channelName.toLowerCase().replace(/[^a-z0-9_]/g, "");

		if (!sanitizedChannel) {
			promiseResolve(new Error("Invalid channel name"));
			return;
		}

		if (!existsSync(CHATTERINO_PATH)) {
			promiseResolve(new Error(`Chatterino executable not found: ${CHATTERINO_PATH}`));
			return;
		}

		const commandArguments = ["-c", sanitizedChannel];

		try {
			const child = spawn(
				"cmd.exe",
				["/c", "start", "", CHATTERINO_PATH, ...commandArguments],
				{
					detached: true,
					stdio: "ignore",
					windowsHide: true,
				},
			);

			child.once("error", (error: Error) => {
				promiseResolve(new Error(`Failed to launch Chatterino: ${error.message}`));
			});
			child.once("spawn", () => {
				child.unref();
				promiseResolve();
			});
		} catch (error) {
			if (error instanceof Error) {
				promiseResolve(new Error(`Failed to launch Chatterino: ${error.message}`));
				return;
			}
			promiseResolve(new Error("Failed to launch Chatterino: unknown error"));
		}
	});
}
