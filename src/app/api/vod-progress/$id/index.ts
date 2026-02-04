import { createFileRoute } from "@tanstack/react-router";

import { deletePlaybackProgress, getPlaybackProgress } from "@/src/features/vods/vods.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/vod-progress/$id/")({
	server: {
		handlers: {
			GET: async function handler({ params }) {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const result = getPlaybackProgress(params.id);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ progress: result });
			},
			DELETE: async function handler({ params }) {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const result = deletePlaybackProgress(params.id);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: result });
			},
		},
	},
});
