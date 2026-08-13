/**
 * Zero-Knowledge Client-Side Cryptography Utilities
 *
 * All encryption/decryption happens exclusively in the browser.
 * The server never receives plaintext secrets or encryption keys.
 * Uses the native Web Crypto API with AES-GCM-256.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

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
  // Pad with '=' to make length a multiple of 4
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
 * Generates a new AES-GCM 256-bit encryption key
 * and returns it as a URL-safe Base64 string.
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
 * Encrypts plaintext using AES-GCM-256.
 *
 * @param text - The plaintext string to encrypt.
 * @param keyBase64 - The URL-safe Base64-encoded encryption key.
 * @returns A Base64-encoded string containing the IV prepended to the ciphertext.
 */
export async function encryptMessage(
  text: string,
  keyBase64: string
): Promise<string> {
  const keyBuffer = base64UrlToBuffer(keyBase64);
  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Prepend IV to ciphertext: [IV (12 bytes) | ciphertext (N bytes)]
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bufferToBase64Url(combined.buffer);
}

/**
 * Decrypts an AES-GCM-256 encrypted payload.
 *
 * @param encryptedData - Base64-encoded string containing IV + ciphertext.
 * @param keyBase64 - The URL-safe Base64-encoded encryption key.
 * @returns The decrypted plaintext string.
 * @throws Error if decryption fails (wrong key, corrupted data, etc.).
 */
export async function decryptMessage(
  encryptedData: string,
  keyBase64: string
): Promise<string> {
  const combined = new Uint8Array(base64UrlToBuffer(encryptedData));

  if (combined.length < IV_LENGTH + 1) {
    throw new Error("Encrypted data is too short to contain IV and ciphertext.");
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const keyBuffer = base64UrlToBuffer(keyBase64);
  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: ALGORITHM },
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
