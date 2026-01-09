import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get the encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return key;
}

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  const encryptionKey = getEncryptionKey();
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypt credentials using AES-256-GCM
 * @param credentials - Object containing username/password or OAuth tokens
 * @returns Base64-encoded encrypted string
 */
export function encryptCredentials(credentials: Record<string, unknown>): string {
  const plaintext = JSON.stringify(credentials);

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from password and salt
  const key = deriveKey(salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the data
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get the authentication tag
  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted data
  const result = Buffer.concat([salt, iv, tag, encrypted]);

  // Return as base64
  return result.toString('base64');
}

/**
 * Decrypt credentials
 * @param encryptedData - Base64-encoded encrypted string
 * @returns Decrypted credentials object
 */
export function decryptCredentials(encryptedData: string): Record<string, unknown> {
  // Decode from base64
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key from password and salt
  const key = deriveKey(salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt the data
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // Parse and return JSON
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Encrypt password-based credentials
 */
export function encryptPasswordCredentials(
  username: string,
  password: string
): string {
  return encryptCredentials({ username, password, type: 'password' });
}

/**
 * Encrypt OAuth token credentials
 */
export function encryptOAuthCredentials(
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number
): string {
  return encryptCredentials({
    accessToken,
    refreshToken,
    expiresAt,
    type: 'oauth',
  });
}

/**
 * Decrypt and validate password credentials
 */
export function decryptPasswordCredentials(encryptedData: string): {
  username: string;
  password: string;
} {
  const credentials = decryptCredentials(encryptedData);

  if (credentials.type !== 'password') {
    throw new Error('Invalid credentials type: expected password');
  }

  return {
    username: credentials.username as string,
    password: credentials.password as string,
  };
}

/**
 * Decrypt and validate OAuth credentials
 */
export function decryptOAuthCredentials(encryptedData: string): {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
} {
  const credentials = decryptCredentials(encryptedData);

  if (credentials.type !== 'oauth') {
    throw new Error('Invalid credentials type: expected oauth');
  }

  return {
    accessToken: credentials.accessToken as string,
    refreshToken: credentials.refreshToken as string | undefined,
    expiresAt: credentials.expiresAt as number | undefined,
  };
}
