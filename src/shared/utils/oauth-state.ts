import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function getStateSecret(): string {
	// Use TOKEN_ENCRYPTION_KEY or a dedicated STATE_SECRET, fall back to a default for dev
	return process.env.TOKEN_ENCRYPTION_KEY ?? process.env.STATE_SECRET ?? "draks-tv-state-secret";
}

function generateState(): string {
	return randomBytes(32).toString("hex");
}

function createStateToken(): string {
	const timestamp = Date.now().toString(36);
	const random = randomBytes(16).toString("hex");
	const data = `${timestamp}.${random}`;

	const secret = getStateSecret();
	const hmac = createHmac("sha256", secret).update(data).digest("hex");

	return `${data}.${hmac}`;
}

function validateStateToken(token: string): boolean {
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

export { generateState, createStateToken, validateStateToken };
