export function parseSaveProgressBody(body: unknown) {
	if (typeof body !== "object" || body === null) {
		return new Error("Invalid request body");
	}

	if (!("vodId" in body) || typeof body.vodId !== "string") {
		return new Error("Missing or invalid vodId");
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
		positionSeconds: body.positionSeconds,
		durationSeconds,
	};
}
