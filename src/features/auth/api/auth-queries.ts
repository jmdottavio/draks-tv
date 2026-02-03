import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { AuthStatus, AuthUrl } from "../auth.types";

export async function fetchAuthStatus(): Promise<AuthStatus> {
	const response = await fetch("/api/auth/status");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch auth status");
		throw new Error(message);
	}

	return response.json() as Promise<AuthStatus>;
}

export async function fetchAuthUrl(): Promise<AuthUrl> {
	const response = await fetch("/api/auth/url");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch auth URL");
		throw new Error(message);
	}

	return response.json() as Promise<AuthUrl>;
}
