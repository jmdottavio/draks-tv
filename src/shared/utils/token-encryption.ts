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

// Strengthened scrypt parameters
const SCRYPT_OPTIONS: ScryptOptions = {
	N: 131072, // CPU/memory cost (2^17)
	r: 8, // Block size
	p: 1, // Parallelization
	maxmem: 256 * 1024 * 1024, // 256MB
};

const KEY_FILE_PATH = resolve(process.cwd(), "data/.encryption-key");

// Module-level cache for derived key
let cachedKey: Buffer | null = null;
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
			const parsed: unknown = JSON.parse(content);

			// Validate parsed content has required fields
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				"secret" in parsed &&
				typeof parsed.secret === "string" &&
				parsed.secret !== "" &&
				"salt" in parsed &&
				typeof parsed.salt === "string" &&
				parsed.salt !== ""
			) {
				console.warn(
					"[SECURITY WARNING] Using auto-generated encryption key from file. Set TOKEN_ENCRYPTION_KEY environment variable for production use.",
				);
				return { secret: parsed.secret, salt: Buffer.from(parsed.salt, "hex") };
			}

			// File exists but is missing secret (e.g., salt-only from env key usage)
			// Fall through to generate new key
			console.warn(
				"[SECURITY WARNING] Key file exists but is missing secret. Generating new key.",
			);
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
			const parsed: unknown = JSON.parse(content);

			if (
				typeof parsed === "object" &&
				parsed !== null &&
				"salt" in parsed &&
				typeof parsed.salt === "string" &&
				parsed.salt !== ""
			) {
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
	if (cachedKey !== null) {
		return cachedKey;
	}

	const { secret, salt } = getOrCreateKeyConfig();
	cachedKey = scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS);
	cachedSalt = salt;
	cachedSecret = secret;

	return cachedKey;
}

function encryptToken(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	const combined = Buffer.concat([iv, authTag, encrypted]);

	return combined.toString("base64");
}

function decryptToken(ciphertext: string): string | Error {
	// Strip legacy "v2:" prefix if present (for backwards compat with existing tokens)
	const data = ciphertext.startsWith("v2:") ? ciphertext.slice(3) : ciphertext;

	const key = getEncryptionKey();
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
		return new Error("Failed to decrypt token - key mismatch or corrupted data");
	}
}

export { encryptToken, decryptToken };
