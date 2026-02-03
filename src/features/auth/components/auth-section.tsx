import { TwitchIcon } from "@/src/shared/components/icons";

import { fetchAuthUrl } from "../api/auth-queries";

export function AuthSection() {
	async function handleLogin() {
		try {
			const { url } = await fetchAuthUrl();
			window.location.href = url;
		} catch {
			// Auth URL fetch failed - user can retry by clicking login again
		}
	}

	return (
		<section className="flex flex-col items-center justify-center text-center py-20 max-w-[400px] mx-auto">
			<div className="text-twitch-purple mb-6">
				<TwitchIcon className="w-16 h-16" />
			</div>

			<h2 className="text-2xl font-semibold mb-3">Connect to Twitch</h2>
			<p className="text-text-muted mb-6">
				Login with your Twitch account to see your followed streams.
			</p>

			<button
				onClick={handleLogin}
				className="flex items-center gap-3 px-7 py-3.5 rounded-md bg-twitch-purple text-white text-base font-semibold hover:bg-twitch-purple-hover transition-all"
			>
				<TwitchIcon className="w-5 h-5" />
				Login with Twitch
			</button>
		</section>
	);
}
