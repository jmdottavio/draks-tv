import { createFileRoute } from "@tanstack/react-router";

import {
	getPlaybackProgressBulk,
	getRecentProgress,
	savePlaybackProgress,
} from "@/src/features/vods/playback-progress.repository";
import { parseSaveProgressBody } from "@/src/features/vods/vods.validators";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/vod-progress/")({
	server: {
		handlers: {
			GET: async function handler({ request }) {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const url = new URL(request.url);
				const idsParam = url.searchParams.get("ids");

				if (idsParam !== null) {
					const ids = idsParam.split(",").filter(Boolean);
					const result = getPlaybackProgressBulk(ids);

					if (result instanceof Error) {
						return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
					}

					return Response.json({ progress: result });
				}

				const result = getRecentProgress();

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ progress: result });
			},
			POST: async function handler({ request }) {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return createErrorResponse(
						"Invalid JSON body",
						ErrorCode.VALIDATION_ERROR,
						400,
					);
				}

				const parsed = parseSaveProgressBody(body);

				if (parsed instanceof Error) {
					return createErrorResponse(parsed.message, ErrorCode.VALIDATION_ERROR, 400);
				}

				const result = savePlaybackProgress(parsed);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: true }, { status: 201 });
			},
		},
	},
});
