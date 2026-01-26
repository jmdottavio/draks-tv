import { createFileRoute } from "@tanstack/react-router";

import { clearAuth } from "@/src/db/repositories/auth-repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/logout/")({
	server: {
		handlers: {
			POST: async function handler() {
				const result = clearAuth();

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: true });
			},
		},
	},
});
