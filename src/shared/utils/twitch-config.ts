// Centralized Twitch credentials configuration
// All auth endpoints and services should import from here

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? "";

function getTwitchClientId() {
	if (TWITCH_CLIENT_ID === "") {
		return undefined;
	}
	return TWITCH_CLIENT_ID;
}

function getTwitchClientSecret() {
	if (TWITCH_CLIENT_SECRET === "") {
		return undefined;
	}
	return TWITCH_CLIENT_SECRET;
}

export { getTwitchClientId, getTwitchClientSecret };
