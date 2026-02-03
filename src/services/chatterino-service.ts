import { spawn } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { resolve } from "path";

function parseCommandLine(commandLine: string) {
	const tokens: Array<string> = [];
	const matcher = /"([^"]*)"|[^\s"]+/g;

	let match = matcher.exec(commandLine);
	while (match) {
		if (match[1] !== undefined) {
			tokens.push(match[1]);
		} else {
			tokens.push(match[0]);
		}
		match = matcher.exec(commandLine);
	}

	return tokens;
}

function isWindowsPath(command: string) {
	return /[\\/]/.test(command) || /^[a-zA-Z]:/.test(command);
}

function resolveWindowsChatterinoCommand(command: string) {
	const candidates: Array<string> = [];
	if (command) {
		candidates.push(command);
	}

	const PROGRAMFILES = process.env.PROGRAMFILES ?? "C:\\Program Files";
	const PROGRAMFILES_X86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
	const LOCALAPPDATA = process.env.LOCALAPPDATA ?? "";

	candidates.push(resolve(PROGRAMFILES, "Chatterino", "chatterino.exe"));
	candidates.push(resolve(PROGRAMFILES_X86, "Chatterino", "chatterino.exe"));
	if (LOCALAPPDATA) {
		candidates.push(resolve(LOCALAPPDATA, "Programs", "Chatterino", "chatterino.exe"));
	}

	const existing = candidates.find((candidate) => existsSync(candidate));

	return {
		command: existing ?? command,
		candidates,
	};
}

function getChatterinoConfig() {
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
			command: resolve(PROGRAMFILES, "Chatterino", "chatterino.exe"),
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

export function launchChatterino(channelName: string) {
	return new Promise<void | Error>((promiseResolve) => {
		if (!chatterinoConfig.enabled) {
			promiseResolve(new Error("Chatterino integration is not available on this platform"));
			return;
		}

		const sanitizedChannel = channelName.toLowerCase().replace(/[^a-z0-9_]/g, "");

		if (!sanitizedChannel) {
			promiseResolve(new Error("Invalid channel name"));
			return;
		}

		const configuredCommandLine = chatterinoConfig.command.trim();
		const hasEnvCommand = Boolean(process.env.CHATTERINO_PATH);
		let configuredExists = false;
		if (configuredCommandLine) {
			configuredExists = existsSync(configuredCommandLine);
		}
		const shouldParse = hasEnvCommand || !configuredExists;
		let configuredTokens: Array<string> = [];
		if (shouldParse) {
			configuredTokens = parseCommandLine(configuredCommandLine);
		}
		let resolvedCommand = configuredCommandLine;
		let resolvedArguments: Array<string> = [];
		if (shouldParse && configuredTokens.length > 0) {
			resolvedCommand = configuredTokens[0] ?? "";
			resolvedArguments = configuredTokens.slice(1);
		}

		if (!resolvedCommand) {
			promiseResolve(new Error("Chatterino executable not configured"));
			return;
		}
		const commandArguments = [
			...resolvedArguments,
			...chatterinoConfig.baseArguments,
			"-c",
			sanitizedChannel,
		];

		const isWindows = platform() === "win32";
		let resolvedWindowsCommand = resolvedCommand;
		let candidates: Array<string> = [];
		if (isWindows) {
			const resolved = resolveWindowsChatterinoCommand(resolvedCommand);
			resolvedWindowsCommand = resolved.command;
			candidates = resolved.candidates;
		}

		if (isWindows && isWindowsPath(resolvedWindowsCommand) && !existsSync(resolvedWindowsCommand)) {
			const windowsCandidates = candidates.filter((candidate) => isWindowsPath(candidate));
			const checked = windowsCandidates.join("; ");
			promiseResolve(
				new Error(
					`Chatterino executable not found. Checked: ${checked || resolvedWindowsCommand}`,
				),
			);
			return;
		}

		try {
			let spawnCommand = resolvedWindowsCommand;
			let spawnArguments = commandArguments;
			if (isWindows) {
				spawnCommand = "cmd.exe";
				spawnArguments = ["/c", "start", "", resolvedWindowsCommand, ...commandArguments];
			}
			const child = spawn(spawnCommand, spawnArguments, {
				detached: true,
				stdio: "ignore",
				windowsHide: true,
			});

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
