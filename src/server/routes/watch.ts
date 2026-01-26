import { Router } from "express";

import { launchLiveStream, launchVod } from "../services/streamlink-service";

const router = Router();

router.post("/live/:channel", async (request, response) => {
	const { channel } = request.params;
	const result = await launchLiveStream(channel);

	if (result instanceof Error) {
		response.status(500).json({ error: result.message });
		return;
	}

	response.json({ success: true });
});

router.post("/vod/:id", async (request, response) => {
	const { id } = request.params;
	const result = await launchVod(id);

	if (result instanceof Error) {
		response.status(500).json({ error: result.message });
		return;
	}

	response.json({ success: true });
});

export { router as watchRouter };
