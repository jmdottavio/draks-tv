type EnvValidationResult = {
	valid: boolean;
	errors: Array<string>;
	warnings: Array<string>;
};

function validateEnvironment(): EnvValidationResult {
	const errors: Array<string> = [];
	const warnings: Array<string> = [];

	// Required variables
	if (!process.env.TWITCH_CLIENT_ID) {
		errors.push("TWITCH_CLIENT_ID is required");
	}

	if (!process.env.TWITCH_CLIENT_SECRET) {
		errors.push("TWITCH_CLIENT_SECRET is required");
	}

	// Optional but recommended for security
	if (!process.env.TOKEN_ENCRYPTION_KEY) {
		warnings.push(
			"TOKEN_ENCRYPTION_KEY not set - an auto-generated key will be used. Set this for production deployments.",
		);
	}

	// Check if encryption key is strong enough (if provided)
	if (process.env.TOKEN_ENCRYPTION_KEY && process.env.TOKEN_ENCRYPTION_KEY.length < 32) {
		warnings.push(
			"TOKEN_ENCRYPTION_KEY should be at least 32 characters for adequate security",
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

function validateAndLog(): boolean {
	const result = validateEnvironment();

	for (const warning of result.warnings) {
		console.warn(`[ENV WARNING] ${warning}`);
	}

	for (const error of result.errors) {
		console.error(`[ENV ERROR] ${error}`);
	}

	if (!result.valid) {
		console.error("[ENV] Environment validation failed. Please check your .env file.");
	}

	return result.valid;
}

export { validateAndLog };
