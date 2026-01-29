import { createFileRoute } from "@tanstack/react-router";

import { launchChatterino } from "@/src/services/chatterino-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/chat/$channel/")({
	server: {
		handlers: {
			POST: async ({ params }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const { channel } = params;

				const result = await launchChatterino(channel);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.CHATTERINO_ERROR, 500);
				}

				return Response.json({ success: true });
			},
		},
	},
});
