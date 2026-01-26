IMPORTANT - these notes are from a 3rd party LLM agent that did NOT have access to the codebase. Adapt all code examples to the actual codebase following all proper patterns and the @knowledge directory files.

---

## Phase 1: Install Chatterino

### Windows (Your Current Setup)

```powershell
# Option A: Winget (Recommended)
winget install ChatterinoTeam.Chatterino2

# Option B: Download installer directly
# https://github.com/Chatterino/chatterino2/releases/latest
# Download the .exe installer and run it
```

Default install location is typically `C:\Program Files\Chatterino2\chatterino.exe`

### Linux (For Production)

```bash
# Flatpak (works across distros)
flatpak install flathub com.chatterino.chatterino
```

---

## Phase 2: Verify CLI Works

### Windows

```powershell
# If installed via winget or default path
& "C:\Program Files\Chatterino2\chatterino.exe" --channels sodapoppin
```

### Linux

```bash
flatpak run com.chatterino.chatterino --channels sodapoppin
```

This should open Chatterino with the channel's chat tab.

## Phase 3: Backend Implementation (TanStack Start)

### 3a: Server Config

```ts
// src/server/config.ts

import { platform } from "os";

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
		return {
			enabled: true,
			command: "C:\\Program Files\\Chatterino2\\chatterino.exe",
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

export const serverConfig = {
	streamlinkPath: process.env.STREAMLINK_PATH || "streamlink",
	chatterino: getChatterinoConfig(),
};
```

### 3b: Spawn Utility

```ts
// src/server/utils/spawn-chatterino.ts

import { spawn } from "child_process";
import { serverConfig } from "../config";

type ChatterinoResult = { success: true } | { success: false; error: string };

export function spawnChatterino(channelName: string): ChatterinoResult {
	const { chatterino } = serverConfig;

	if (!chatterino.enabled) {
		return {
			success: false,
			error: "Chatterino integration is not available on this platform",
		};
	}

	const sanitizedChannel = channelName.toLowerCase().trim();

	if (!sanitizedChannel || !/^[a-z0-9_]+$/.test(sanitizedChannel)) {
		return { success: false, error: "Invalid channel name" };
	}

	try {
		const fullArguments = [...chatterino.baseArguments, "--channels", sanitizedChannel];

		const childProcess = spawn(chatterino.command, fullArguments, {
			detached: true,
			stdio: "ignore",
			shell: process.platform === "win32",
		});

		childProcess.unref();

		return { success: true };
	} catch (exception) {
		const errorMessage = exception instanceof Error ? exception.message : "Unknown error";
		return { success: false, error: errorMessage };
	}
}
```

### 3c: Server Function

```ts
// src/server/functions/open-chatterino.ts

import { createServerFn } from "@tanstack/start";
import { spawnChatterino } from "../utils/spawn-chatterino";

type OpenChatterinoInput = {
	channelName: string;
};

type OpenChatterinoResult = { success: true } | { success: false; error: string };

export const openChatterino = createServerFn({ method: "POST" })
	.validator((data: OpenChatterinoInput) => {
		if (!data.channelName) {
			throw new Error("Channel name is required");
		}
		return data;
	})
	.handler(async ({ data }): Promise<OpenChatterinoResult> => {
		return spawnChatterino(data.channelName);
	});
```

---

## Phase 4: Frontend

### 4a: Hook

```ts
// src/hooks/use-open-chatterino.ts

import { useMutation } from "@tanstack/react-query";
import { openChatterino } from "../server/functions/open-chatterino";

type OpenChatterinoVariables = {
	channelName: string;
};

export function useOpenChatterino() {
	return useMutation({
		mutationFn: (variables: OpenChatterinoVariables) => openChatterino({ data: variables }),
	});
}
```

### 4b: Button Component

```tsx
// src/components/open-chat-button.tsx

import { useOpenChatterino } from "../hooks/use-open-chatterino";

type OpenChatButtonProps = {
	channelName: string;
	variant?: "icon" | "full";
};

export function OpenChatButton({ channelName, variant = "full" }: OpenChatButtonProps) {
	const openChatterinoMutation = useOpenChatterino();

	function handleClick() {
		openChatterinoMutation.mutate({ channelName });
	}

	const isLoading = openChatterinoMutation.isPending;

	if (variant === "icon") {
		return (
			<button
				onClick={handleClick}
				disabled={isLoading}
				className="p-2 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
				title="Open chat in Chatterino"
			>
				<ChatIcon className="w-5 h-5" />
			</button>
		);
	}

	return (
		<button
			onClick={handleClick}
			disabled={isLoading}
			className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors disabled:opacity-50"
		>
			{isLoading ? "Opening..." : "Open Chat"}
		</button>
	);
}
```

---

## Optional: Combined Watch + Chat

```ts
// src/server/functions/watch-with-chat.ts

import { createServerFn } from "@tanstack/start";
import { spawnChatterino } from "../utils/spawn-chatterino";
import { spawnStreamlink } from "../utils/spawn-streamlink"; // Your existing util

type WatchWithChatInput = {
	channelName: string;
};

type WatchWithChatResult = {
	streamlink: { success: boolean; error?: string };
	chatterino: { success: boolean; error?: string };
};

export const watchWithChat = createServerFn({ method: "POST" })
	.validator((data: WatchWithChatInput) => {
		if (!data.channelName) {
			throw new Error("Channel name is required");
		}
		return data;
	})
	.handler(async ({ data }): Promise<WatchWithChatResult> => {
		const streamlinkResult = spawnStreamlink(data.channelName);
		const chatterinoResult = spawnChatterino(data.channelName);

		return {
			streamlink: streamlinkResult,
			chatterino: chatterinoResult,
		};
	});
```

---

## Checklist

1. [ ] Install Chatterino on Windows via `winget install ChatterinoTeam.Chatterino2`
2. [ ] Test CLI works with a channel name
3. [ ] Log into Chatterino with your Twitch account
4. [ ] Add server config with platform detection
5. [ ] Add `spawnChatterino` utility
6. [ ] Add `openChatterino` server function
7. [ ] Add `useOpenChatterino` hook
8. [ ] Add `OpenChatButton` component
9. [ ] Add button to stream cards
