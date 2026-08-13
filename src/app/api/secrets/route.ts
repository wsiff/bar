/**
 * POST /api/secrets
 *
 * Accepts an encrypted payload and TTL, stores it in Upstash Redis
 * with an auto-expiring key, and returns a unique secret ID.
 *
 * The server never sees plaintext — only the client-encrypted ciphertext.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { REDIS_KEY_PREFIX, TTL_OPTIONS } from "@/lib/constants";

interface CreateSecretBody {
  encryptedPayload: string;
  ttlSeconds: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateSecretBody;

    // --- Validation ---
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

    // Enforce a sensible max payload size (500KB of Base64 ciphertext)
    if (body.encryptedPayload.length > 512_000) {
      return NextResponse.json(
        { error: "Payload too large. Maximum size is ~375KB of plaintext." },
        { status: 413 }
      );
    }

    // --- Store in Redis ---
    const id = nanoid(21); // 21-char high-entropy ID (default nanoid length)
    const redisKey = `${REDIS_KEY_PREFIX}${id}`;

    await getRedis().set(redisKey, body.encryptedPayload, {
      ex: body.ttlSeconds,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/secrets] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
