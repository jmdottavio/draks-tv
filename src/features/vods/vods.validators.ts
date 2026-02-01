function parseSaveProgressBody(body: unknown) {
	if (typeof body !== "object" || body === null) {
		return new Error("Invalid request body");
	}

	if (!("vodId" in body) || typeof body.vodId !== "string") {
		return new Error("Missing or invalid vodId");
	}

	if (!("channelId" in body) || typeof body.channelId !== "string") {
		return new Error("Missing or invalid channelId");
	}

	if (!("channelName" in body) || typeof body.channelName !== "string") {
		return new Error("Missing or invalid channelName");
	}

	if (!("vodTitle" in body) || typeof body.vodTitle !== "string") {
		return new Error("Missing or invalid vodTitle");
	}

	if (!("positionSeconds" in body) || typeof body.positionSeconds !== "number") {
		return new Error("Missing or invalid positionSeconds");
	}

	const durationSeconds =
		"durationSeconds" in body && typeof body.durationSeconds === "number"
			? body.durationSeconds
			: undefined;

	return {
		vodId: body.vodId,
		channelId: body.channelId,
		channelName: body.channelName,
		vodTitle: body.vodTitle,
		positionSeconds: body.positionSeconds,
		durationSeconds,
	};
}

export { parseSaveProgressBody };
