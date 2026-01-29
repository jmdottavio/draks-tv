import { spawn } from "child_process";
import { platform } from "os";
import { resolve } from "path";

type ChatterinoConfig = {
	enabled: boolean;
	command: string;
	baseArguments: Array<string>;
};

function getChatterinoConfig(): ChatterinoConfig {
	const envCommand = process.env.CHATTERINO_PATH;
	const envEnabled = process.env.CHATTERINO_ENABLED !== "false";

	if (envCommand) {
		return {
			enabled: envEnabled,
			command: envCommand,
			baseArguments: [],
		};
	}

	const currentPlatform = platform();

	if (currentPlatform === "win32") {
		const PROGRAMFILES = process.env.PROGRAMFILES ?? "C:\\Program Files";
		return {
			enabled: true,
			command: resolve(PROGRAMFILES, "Chatterino2", "chatterino.exe"),
			baseArguments: [],
		};
	}

	if (currentPlatform === "linux") {
		return {
			enabled: true,
			command: "flatpak",
			baseArguments: ["run", "com.chatterino.chatterino"],
		};
	}

	return {
		enabled: false,
		command: "",
		baseArguments: [],
	};
}

const chatterinoConfig = getChatterinoConfig();

function launchChatterino(channelName: string): Promise<void | Error> {
	return new Promise((promiseResolve) => {
		if (!chatterinoConfig.enabled) {
			promiseResolve(new Error("Chatterino integration is not available on this platform"));
			return;
		}

		const sanitizedChannel = channelName.toLowerCase().replace(/[^a-z0-9_]/g, "");

		if (!sanitizedChannel) {
			promiseResolve(new Error("Invalid channel name"));
			return;
		}

		const fullArguments = [...chatterinoConfig.baseArguments, "--channels", sanitizedChannel];

		const childProcess = spawn(chatterinoConfig.command, fullArguments, {
			detached: true,
			stdio: "ignore",
			shell: platform() === "win32",
		});

		childProcess.on("error", (error) => {
			promiseResolve(new Error(`Failed to launch Chatterino: ${error.message}`));
		});

		childProcess.unref();

		// Chatterino launches asynchronously, resolve immediately after spawn
		promiseResolve();
	});
}

export { launchChatterino };
