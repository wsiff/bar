/**
 * Zero-Knowledge Client-Side Cryptography Utilities
 *
 * All encryption and decryption happens exclusively in the browser.
 * The server never receives plaintext secrets, passphrase hashes, or encryption keys.
 *
 * Features:
 * - Native Web Crypto API (AES-GCM 256-bit)
 * - Optional PBKDF2-HMAC-SHA256 (100,000 iterations) for passphrase-protected secrets
 * - Onion/Layered encryption when passphrase is used
 * - URL-safe binary encoding
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const SALT_LENGTH = 16; // 128-bit salt for PBKDF2
const PBKDF2_ITERATIONS = 100_000;

// Format magic headers for envelope detection
const HEADER_PLAIN = 0x01; // v1: AES-GCM URL key only
const HEADER_PASSPHRASE = 0x02; // v1: AES-GCM URL key + PBKDF2 Passphrase

/**
 * Converts an ArrayBuffer to a URL-safe Base64 string.
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts a URL-safe Base64 string back to an ArrayBuffer.
 */
function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passphrase using PBKDF2-HMAC-SHA256.
 */
async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKeyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKeyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a new random AES-GCM 256-bit encryption key
 * and returns it as a URL-safe Base64 string (for the #key fragment).
 */
export async function generateKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ["encrypt", "decrypt"]
  );
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bufferToBase64Url(exported);
}

/**
 * Encrypts plaintext using AES-GCM-256, optionally layering PBKDF2 passphrase encryption.
 *
 * @param text - The plaintext string to encrypt.
 * @param keyBase64 - The URL-safe Base64-encoded link key.
 * @param passphrase - Optional out-of-band passphrase for dual-layer encryption.
 * @returns A URL-safe Base64-encoded encrypted payload.
 */
export async function encryptMessage(
  text: string,
  keyBase64: string,
  passphrase?: string
): Promise<string> {
  const encoder = new TextEncoder();
  let payloadBytes = encoder.encode(text);
  let header = HEADER_PLAIN;
  let saltBytes: Uint8Array | null = null;

  // Layer 1: If passphrase is provided, encrypt plaintext with PBKDF2 derived key first
  if (passphrase && passphrase.trim().length > 0) {
    header = HEADER_PASSPHRASE;
    saltBytes = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const passKey = await derivePassphraseKey(passphrase, saltBytes);
    const passIv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const passCiphertext = await window.crypto.subtle.encrypt(
      { name: ALGORITHM, iv: passIv },
      passKey,
      payloadBytes
    );

    // Inner bundle: [Passphrase IV (12B) | Passphrase Ciphertext]
    const innerBundle = new Uint8Array(passIv.length + passCiphertext.byteLength);
    innerBundle.set(passIv, 0);
    innerBundle.set(new Uint8Array(passCiphertext), passIv.length);
    payloadBytes = innerBundle;
  }

  // Layer 2: Encrypt with the URL link key
  const urlKeyBuffer = base64UrlToBuffer(keyBase64);
  const urlKey = await window.crypto.subtle.importKey(
    "raw",
    urlKeyBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt"]
  );

  const urlIv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const outerCiphertext = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: urlIv },
    urlKey,
    payloadBytes
  );

  // Construct Final Binary Envelope:
  // If PLAIN: [Header (1B) | URL IV (12B) | Outer Ciphertext]
  // If PASSPHRASE: [Header (1B) | Salt (16B) | URL IV (12B) | Outer Ciphertext]
  const saltLen = saltBytes ? saltBytes.length : 0;
  const totalLen = 1 + saltLen + urlIv.length + outerCiphertext.byteLength;
  const finalBundle = new Uint8Array(totalLen);

  let offset = 0;
  finalBundle[offset] = header;
  offset += 1;

  if (saltBytes) {
    finalBundle.set(saltBytes, offset);
    offset += saltBytes.length;
  }

  finalBundle.set(urlIv, offset);
  offset += urlIv.length;

  finalBundle.set(new Uint8Array(outerCiphertext), offset);

  return bufferToBase64Url(finalBundle.buffer);
}

/**
 * Inspects an encrypted payload to check if it requires a passphrase to decrypt.
 */
export function inspectSecretEnvelope(encryptedData: string): {
  requiresPassphrase: boolean;
} {
  try {
    const combined = new Uint8Array(base64UrlToBuffer(encryptedData));
    if (combined.length > 0 && combined[0] === HEADER_PASSPHRASE) {
      return { requiresPassphrase: true };
    }
    return { requiresPassphrase: false };
  } catch {
    return { requiresPassphrase: false };
  }
}

/**
 * Decrypts an AES-GCM-256 payload using the link key and optional passphrase.
 *
 * @param encryptedData - Base64-encoded encrypted envelope.
 * @param keyBase64 - The URL-safe Base64-encoded link key.
 * @param passphrase - Optional passphrase if required.
 * @returns The decrypted plaintext string.
 */
export async function decryptMessage(
  encryptedData: string,
  keyBase64: string,
  passphrase?: string
): Promise<string> {
  const combined = new Uint8Array(base64UrlToBuffer(encryptedData));

  // Legacy fallback support for raw [IV (12B) | Ciphertext] without header
  const isV1Header =
    combined[0] === HEADER_PLAIN || combined[0] === HEADER_PASSPHRASE;

  let offset = 0;
  let hasPassphrase = false;
  let salt: Uint8Array | null = null;

  if (isV1Header) {
    const header = combined[offset];
    offset += 1;
    if (header === HEADER_PASSPHRASE) {
      hasPassphrase = true;
      salt = combined.slice(offset, offset + SALT_LENGTH);
      offset += SALT_LENGTH;
    }
  }

  const urlIv = combined.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const outerCiphertext = combined.slice(offset);

  // Step 1: Decrypt outer layer with URL link key
  const urlKeyBuffer = base64UrlToBuffer(keyBase64);
  const urlKey = await window.crypto.subtle.importKey(
    "raw",
    urlKeyBuffer,
    { name: ALGORITHM },
    false,
    ["decrypt"]
  );

  const decryptedOuter = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: urlIv },
    urlKey,
    outerCiphertext
  );

  // If no passphrase was required, this is the plaintext
  if (!hasPassphrase) {
    const decoder = new TextDecoder();
    return decoder.decode(decryptedOuter);
  }

  // Step 2: Passphrase required for inner layer
  if (!passphrase) {
    throw new Error("PASSPHRASE_REQUIRED");
  }

  if (!salt) {
    throw new Error("Corrupted payload: Missing salt for passphrase decryption.");
  }

  const innerBytes = new Uint8Array(decryptedOuter);
  if (innerBytes.length < IV_LENGTH + 1) {
    throw new Error("Corrupted payload: Inner ciphertext is invalid.");
  }

  const passIv = innerBytes.slice(0, IV_LENGTH);
  const passCiphertext = innerBytes.slice(IV_LENGTH);

  const passKey = await derivePassphraseKey(passphrase, salt);

  try {
    const decryptedInner = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv: passIv },
      passKey,
      passCiphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedInner);
  } catch {
    throw new Error("INCORRECT_PASSPHRASE");
  }
}
