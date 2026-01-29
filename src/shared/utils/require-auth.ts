import { getAuth } from "@/src/features/auth/auth.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

interface AuthContext {
	userId: string;
	accessToken: string;
	refreshToken: string;
}

type AuthResult =
	| { authenticated: true; context: AuthContext }
	| { authenticated: false; response: Response };

function requireAuth(): AuthResult {
	const authResult = getAuth();

	if (authResult instanceof Error) {
		return {
			authenticated: false,
			response: createErrorResponse(
				"Authentication check failed",
				ErrorCode.DATABASE_ERROR,
				500,
			),
		};
	}

	if (authResult.accessToken === null || authResult.userId === null) {
		return {
			authenticated: false,
			response: createErrorResponse("Authentication required", ErrorCode.UNAUTHORIZED, 401),
		};
	}

	return {
		authenticated: true,
		context: {
			userId: authResult.userId,
			accessToken: authResult.accessToken,
			refreshToken: authResult.refreshToken ?? "",
		},
	};
}

export { requireAuth };
