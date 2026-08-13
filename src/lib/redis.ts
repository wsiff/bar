/**
 * Upstash Redis Client Initialization
 *
 * Uses the @upstash/redis serverless client configured
 * via environment variables for secure, zero-config deployment.
 *
 * The client is lazily initialized to avoid build-time errors
 * when environment variables are not yet available.
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/**
 * Returns the singleton Upstash Redis client.
 * Throws a descriptive error if environment variables are missing.
 */
export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    throw new Error(
      "Missing environment variable: UPSTASH_REDIS_REST_URL. " +
        "Please set it in your .env.local or deployment environment."
    );
  }

  if (!token) {
    throw new Error(
      "Missing environment variable: UPSTASH_REDIS_REST_TOKEN. " +
        "Please set it in your .env.local or deployment environment."
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}
