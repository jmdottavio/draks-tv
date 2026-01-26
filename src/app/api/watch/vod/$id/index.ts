import { createFileRoute } from "@tanstack/react-router";

import { launchVod } from "@/src/services/streamlink-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/watch/vod/$id/")({
	server: {
		handlers: {
			POST: async ({ params }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const { id } = params;

				const result = await launchVod(id);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.STREAMLINK_ERROR, 500);
				}

				return Response.json({ success: true });
			},
		},
	},
});
