const MAX_ID_LENGTH = 50;
const MAX_CHANNEL_NAME_LENGTH = 100;
const MAX_PROFILE_IMAGE_LENGTH = 500;
const MAX_ORDERED_IDS_COUNT = 1000;

export type AddFavoriteRequest = {
	id: string;
	channelName: string;
	profileImage: string;
};

export type ReorderFavoritesRequest = {
	orderedIds: Array<string>;
};

export function validateAddFavoriteRequest(body: unknown): AddFavoriteRequest | Error {
	if (typeof body !== "object" || body === null) {
		return new Error("Request body must be an object");
	}

	const data = body as Record<string, unknown>;

	if (typeof data.id !== "string" || data.id.length === 0) {
		return new Error("id is required and must be a non-empty string");
	}

	if (data.id.length > MAX_ID_LENGTH) {
		return new Error(`id must not exceed ${MAX_ID_LENGTH} characters`);
	}

	if (typeof data.channelName !== "string" || data.channelName.length === 0) {
		return new Error("channelName is required and must be a non-empty string");
	}

	if (data.channelName.length > MAX_CHANNEL_NAME_LENGTH) {
		return new Error(`channelName must not exceed ${MAX_CHANNEL_NAME_LENGTH} characters`);
	}

	if (typeof data.profileImage !== "string" || data.profileImage.length === 0) {
		return new Error("profileImage is required and must be a non-empty string");
	}

	if (data.profileImage.length > MAX_PROFILE_IMAGE_LENGTH) {
		return new Error(`profileImage must not exceed ${MAX_PROFILE_IMAGE_LENGTH} characters`);
	}

	return {
		id: data.id,
		channelName: data.channelName,
		profileImage: data.profileImage,
	};
}

export function validateReorderFavoritesRequest(body: unknown): ReorderFavoritesRequest | Error {
	if (typeof body !== "object" || body === null) {
		return new Error("Request body must be an object");
	}

	const data = body as Record<string, unknown>;

	if (!Array.isArray(data.orderedIds)) {
		return new Error("orderedIds is required and must be an array");
	}

	if (data.orderedIds.length > MAX_ORDERED_IDS_COUNT) {
		return new Error(`orderedIds must not exceed ${MAX_ORDERED_IDS_COUNT} items`);
	}

	for (const id of data.orderedIds) {
		if (typeof id !== "string") {
			return new Error("orderedIds must be an array of strings");
		}

		if (id.length > MAX_ID_LENGTH) {
			return new Error(`each id in orderedIds must not exceed ${MAX_ID_LENGTH} characters`);
		}
	}

	return {
		orderedIds: data.orderedIds as Array<string>,
	};
}
