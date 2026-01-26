import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
	type ScryptOptions,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

// Version prefix for new encryption format with random salt
const VERSION_PREFIX = "v2:";

// Legacy salt for backwards compatibility with v1 tokens
const LEGACY_SALT = "draks-tv-token-salt";

// Strengthened scrypt parameters
const SCRYPT_OPTIONS: ScryptOptions = {
	N: 131072, // CPU/memory cost (2^17)
	r: 8, // Block size
	p: 1, // Parallelization
	maxmem: 256 * 1024 * 1024, // 256MB
};

const KEY_FILE_PATH = resolve(process.cwd(), "data/.encryption-key");

// Module-level cache for derived keys
let cachedV2Key: Buffer | null = null;
let cachedV1Key: Buffer | null = null;
let cachedSalt: Buffer | null = null;
let cachedSecret: string | null = null;

interface KeyConfig {
	secret: string;
	salt: Buffer;
}

function getOrCreateKeyConfig(): KeyConfig {
	// Check environment variable first
	const envSecret = process.env.TOKEN_ENCRYPTION_KEY;

	if (envSecret !== undefined && envSecret !== "") {
		// Use env key with stored or new salt
		const salt = getOrCreateSalt(envSecret);
		return { secret: envSecret, salt };
	}

	// Check for existing key file
	if (existsSync(KEY_FILE_PATH)) {
		try {
			const content = readFileSync(KEY_FILE_PATH, "utf8");
			const parsed = JSON.parse(content) as { secret: string; salt: string };
			console.warn(
				"[SECURITY WARNING] Using auto-generated encryption key from file. Set TOKEN_ENCRYPTION_KEY environment variable for production use.",
			);
			return { secret: parsed.secret, salt: Buffer.from(parsed.salt, "hex") };
		} catch {
			// Fall through to generate new key
		}
	}

	// Generate new key and salt
	const secret = randomBytes(32).toString("hex");
	const salt = randomBytes(SALT_LENGTH);

	// Save to file
	const dir = dirname(KEY_FILE_PATH);
	mkdirSync(dir, { recursive: true });

	const keyData = JSON.stringify({
		secret,
		salt: salt.toString("hex"),
	});

	// Write with restrictive permissions (0o600 = owner read/write only)
	writeFileSync(KEY_FILE_PATH, keyData, { mode: 0o600 });

	console.warn(
		"[SECURITY WARNING] Generated new encryption key. Set TOKEN_ENCRYPTION_KEY environment variable for production use.",
	);

	return { secret, salt };
}

function getOrCreateSalt(envSecret: string): Buffer {
	// If we already have a cached salt for this secret, return it
	if (cachedSalt !== null && cachedSecret === envSecret) {
		return cachedSalt;
	}

	// Try to load salt from key file when using env secret
	if (existsSync(KEY_FILE_PATH)) {
		try {
			const content = readFileSync(KEY_FILE_PATH, "utf8");
			const parsed = JSON.parse(content) as { salt?: string };
			if (parsed.salt) {
				cachedSalt = Buffer.from(parsed.salt, "hex");
				cachedSecret = envSecret;
				return cachedSalt;
			}
		} catch {
			// Fall through to create new salt
		}
	}

	// Generate new salt and store it
	const salt = randomBytes(SALT_LENGTH);

	const dir = dirname(KEY_FILE_PATH);
	mkdirSync(dir, { recursive: true });

	// Store just the salt (secret comes from env)
	const keyData = JSON.stringify({
		salt: salt.toString("hex"),
	});

	writeFileSync(KEY_FILE_PATH, keyData, { mode: 0o600 });

	cachedSalt = salt;
	cachedSecret = envSecret;

	return salt;
}

function getEncryptionKey(): Buffer {
	if (cachedV2Key !== null) {
		return cachedV2Key;
	}

	const { secret, salt } = getOrCreateKeyConfig();
	cachedV2Key = scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS);
	cachedSalt = salt;
	cachedSecret = secret;

	return cachedV2Key;
}

function getLegacyEncryptionKey(): Buffer {
	if (cachedV1Key !== null) {
		return cachedV1Key;
	}

	// For legacy decryption, we need to derive key the old way
	const envSecret = process.env.TOKEN_ENCRYPTION_KEY;

	if (envSecret !== undefined && envSecret !== "") {
		// Use env key with legacy salt (no scrypt options - use defaults for compatibility)
		cachedV1Key = scryptSync(envSecret, LEGACY_SALT, KEY_LENGTH);
	} else {
		// Check if we have an auto-generated key from v1
		if (existsSync(KEY_FILE_PATH)) {
			try {
				const content = readFileSync(KEY_FILE_PATH, "utf8");
				const parsed = JSON.parse(content) as { secret: string };
				// Use the stored secret with legacy salt
				cachedV1Key = scryptSync(parsed.secret, LEGACY_SALT, KEY_LENGTH);
			} catch {
				// Fall back to the hardcoded default key for legacy tokens
				cachedV1Key = scryptSync("draks-tv-default-key", LEGACY_SALT, KEY_LENGTH);
			}
		} else {
			// No key file exists, use the old hardcoded default for legacy tokens
			cachedV1Key = scryptSync("draks-tv-default-key", LEGACY_SALT, KEY_LENGTH);
		}
	}

	return cachedV1Key;
}

function encryptToken(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	const combined = Buffer.concat([iv, authTag, encrypted]);

	// Return with version prefix to indicate v2 format
	return VERSION_PREFIX + combined.toString("base64");
}

function decryptToken(ciphertext: string): string | Error {
	// Check if this is a v2 encrypted token
	if (ciphertext.startsWith(VERSION_PREFIX)) {
		return decryptV2Token(ciphertext.slice(VERSION_PREFIX.length));
	}

	// Try legacy (v1) decryption for backwards compatibility
	return decryptV1Token(ciphertext);
}

function decryptV2Token(ciphertext: string): string | Error {
	const key = getEncryptionKey();
	const combined = Buffer.from(ciphertext, "base64");

	if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		return new Error("Invalid encrypted token format");
	}

	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	try {
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString("utf8");
	} catch {
		return new Error("Failed to decrypt token - key mismatch or corrupted data");
	}
}

function decryptV1Token(ciphertext: string): string | Error {
	const key = getLegacyEncryptionKey();
	const combined = Buffer.from(ciphertext, "base64");

	if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		return new Error("Invalid encrypted token format");
	}

	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	try {
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString("utf8");
	} catch {
		return new Error("Failed to decrypt token - key mismatch or corrupted data");
	}
}

/**
 * Helper to decrypt with a specific key (for rotation scenarios)
 */
function decryptWithKey(ciphertext: string, key: Buffer): string | Error {
	// Handle version prefix
	let data = ciphertext;
	if (ciphertext.startsWith(VERSION_PREFIX)) {
		data = ciphertext.slice(VERSION_PREFIX.length);
	}

	const combined = Buffer.from(data, "base64");

	if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		return new Error("Invalid encrypted token format");
	}

	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	try {
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString("utf8");
	} catch {
		return new Error("Failed to decrypt token with provided key");
	}
}

/**
 * Re-encrypts data from old key to new key.
 * Used during key rotation to migrate encrypted tokens.
 */
function reEncryptToken(ciphertext: string, oldSecret?: string): string | Error {
	// First decrypt with old key
	let plaintext: string | Error;

	if (oldSecret !== undefined) {
		// Use provided old secret for decryption
		const oldKey = scryptSync(oldSecret, cachedSalt ?? getOrCreateSalt(oldSecret), KEY_LENGTH, SCRYPT_OPTIONS);
		plaintext = decryptWithKey(ciphertext, oldKey);
	} else {
		// Try normal decryption (handles v1 and v2 formats)
		plaintext = decryptToken(ciphertext);
	}

	if (plaintext instanceof Error) {
		return plaintext;
	}

	// Re-encrypt with current key
	return encryptToken(plaintext);
}

/**
 * Clears the cached keys. Call this when rotating to a new key.
 */
function clearKeyCache(): void {
	cachedV2Key = null;
	cachedV1Key = null;
	// Note: Don't clear cachedSalt or cachedSecret as salt should persist
}

export { encryptToken, decryptToken, reEncryptToken, clearKeyCache };
