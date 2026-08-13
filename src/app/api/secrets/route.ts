/**
 * POST /api/secrets
 *
 * Accepts an encrypted payload and TTL, stores it in Upstash Redis
 * with an auto-expiring key, and returns a unique secret ID.
 *
 * Security Enhancements:
 * - Sliding window IP rate limiting (10 creates / min)
 * - Strict payload validation & size clamping (max 512KB ciphertext)
 * - Zero plaintext/key visibility on the server
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { REDIS_KEY_PREFIX, TTL_OPTIONS } from "@/lib/constants";
import { getCreateRateLimiter, getClientIp } from "@/lib/ratelimit";

interface CreateSecretBody {
  encryptedPayload: string;
  ttlSeconds: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Rate Limiting Check
    const ip = getClientIp(request);
    const ratelimit = getCreateRateLimiter();
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many secrets created. Please slow down and try again.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 2. Body Parsing & Validation
    const body = (await request.json()) as CreateSecretBody;

    if (
      !body.encryptedPayload ||
      typeof body.encryptedPayload !== "string" ||
      body.encryptedPayload.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid encryptedPayload." },
        { status: 400 }
      );
    }

    if (
      !body.ttlSeconds ||
      typeof body.ttlSeconds !== "number" ||
      !TTL_OPTIONS.some((opt) => opt.value === body.ttlSeconds)
    ) {
      return NextResponse.json(
        {
          error: `Invalid ttlSeconds. Allowed values: ${TTL_OPTIONS.map(
            (o) => o.value
          ).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // Enforce strict payload ceiling (500KB of Base64 ciphertext)
    if (body.encryptedPayload.length > 512_000) {
      return NextResponse.json(
        { error: "Payload too large. Maximum size is ~375KB." },
        { status: 413 }
      );
    }

    // 3. High-entropy ID Generation & Redis Storage
    const id = nanoid(21);
    const redisKey = `${REDIS_KEY_PREFIX}${id}`;

    await getRedis().set(redisKey, body.encryptedPayload, {
      ex: body.ttlSeconds,
    });

    return NextResponse.json(
      { id },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error("[POST /api/secrets] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
