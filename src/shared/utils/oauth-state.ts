import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Generate a random secret for development if no env var is set
// This is secure because it's generated at startup and not hardcoded
let generatedDevSecret: string | undefined;

function getStateSecret() {
	// Use TOKEN_ENCRYPTION_KEY or a dedicated STATE_SECRET
	const envSecret = process.env.TOKEN_ENCRYPTION_KEY ?? process.env.STATE_SECRET;

	if (envSecret !== undefined && envSecret.length > 0) {
		return envSecret;
	}

	// For development: generate a random secret at startup
	// This prevents using a hardcoded value that could be exploited
	if (generatedDevSecret === undefined) {
		generatedDevSecret = randomBytes(32).toString("hex");
		console.warn(
			"WARNING: No TOKEN_ENCRYPTION_KEY or STATE_SECRET set. Using auto-generated secret. " +
				"Set TOKEN_ENCRYPTION_KEY in production.",
		);
	}

	return generatedDevSecret;
}

function createStateToken() {
	const timestamp = Date.now().toString(36);
	const random = randomBytes(16).toString("hex");
	const data = `${timestamp}.${random}`;

	const secret = getStateSecret();
	const hmac = createHmac("sha256", secret).update(data).digest("hex");

	return `${data}.${hmac}`;
}

function validateStateToken(token: string) {
	const parts = token.split(".");

	if (parts.length !== 3) {
		return false;
	}

	const timestamp = parts[0];
	const random = parts[1];
	const providedHmac = parts[2];

	if (timestamp === undefined || random === undefined || providedHmac === undefined) {
		return false;
	}

	const data = `${timestamp}.${random}`;

	// Verify HMAC with constant-time comparison
	const secret = getStateSecret();
	const expectedHmac = createHmac("sha256", secret).update(data).digest("hex");

	const providedBuf = Buffer.from(providedHmac, "hex");
	const expectedBuf = Buffer.from(expectedHmac, "hex");

	if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
		return false;
	}

	// Check expiry
	const tokenTime = parseInt(timestamp, 36);
	const now = Date.now();

	if (isNaN(tokenTime) || now - tokenTime > STATE_EXPIRY_MS) {
		return false;
	}

	return true;
}

export { createStateToken, validateStateToken };
