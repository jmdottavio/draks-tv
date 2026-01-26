interface AddFavoriteRequest {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
}

interface ReorderFavoritesRequest {
	orderedIds: Array<string>;
}

function validateAddFavoriteRequest(body: unknown): AddFavoriteRequest | Error {
	if (typeof body !== "object" || body === null) {
		return new Error("Request body must be an object");
	}

	const data = body as Record<string, unknown>;

	if (typeof data.id !== "string" || data.id.length === 0) {
		return new Error("id is required and must be a non-empty string");
	}

	if (typeof data.login !== "string" || data.login.length === 0) {
		return new Error("login is required and must be a non-empty string");
	}

	if (typeof data.displayName !== "string" || data.displayName.length === 0) {
		return new Error("displayName is required and must be a non-empty string");
	}

	if (typeof data.profileImage !== "string" || data.profileImage.length === 0) {
		return new Error("profileImage is required and must be a non-empty string");
	}

	return {
		id: data.id,
		login: data.login,
		displayName: data.displayName,
		profileImage: data.profileImage,
	};
}

function validateReorderFavoritesRequest(body: unknown): ReorderFavoritesRequest | Error {
	if (typeof body !== "object" || body === null) {
		return new Error("Request body must be an object");
	}

	const data = body as Record<string, unknown>;

	if (!Array.isArray(data.orderedIds)) {
		return new Error("orderedIds is required and must be an array");
	}

	for (const id of data.orderedIds) {
		if (typeof id !== "string") {
			return new Error("orderedIds must be an array of strings");
		}
	}

	return {
		orderedIds: data.orderedIds as Array<string>,
	};
}

export { validateAddFavoriteRequest, validateReorderFavoritesRequest };
export type { AddFavoriteRequest, ReorderFavoritesRequest };
