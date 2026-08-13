/**
 * Upstash Rate Limiter Initialization
 *
 * Implements IP-based sliding window rate limiting to protect
 * against Denial-of-Service (DoS), spam creation, and secret-ID brute-force attacks.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";
import { NextRequest } from "next/server";

let _createLimiter: Ratelimit | null = null;
let _readLimiter: Ratelimit | null = null;

/**
 * Rate limiter for creating secrets: 10 secrets per 60 seconds per IP.
 */
export function getCreateRateLimiter(): Ratelimit {
  if (!_createLimiter) {
    _createLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: false,
      prefix: "ratelimit:create",
    });
  }
  return _createLimiter;
}

/**
 * Rate limiter for reading secrets: 30 requests per 60 seconds per IP.
 */
export function getReadRateLimiter(): Ratelimit {
  if (!_readLimiter) {
    _readLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: false,
      prefix: "ratelimit:read",
    });
  }
  return _readLimiter;
}

/**
 * Extracts client IP securely from request headers with fallback.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "anonymous-ip";
}
