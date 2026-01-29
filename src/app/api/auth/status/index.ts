import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/features/auth/auth.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/status/")({
	server: {
		handlers: {
			GET: async function handler() {
				const authResult = getAuth();

				if (authResult instanceof Error) {
					return createErrorResponse(authResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				const authenticated = authResult.accessToken !== null && authResult.userId !== null;

				return Response.json({
					authenticated,
					userId: authResult.userId,
				});
			},
		},
	},
});
