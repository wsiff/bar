/**
 * GET /api/secrets/[id]
 *
 * Atomically retrieves and permanently deletes a secret from Redis.
 * Uses GETDEL to ensure only the first requester receives the payload.
 * Any subsequent request receives a 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { REDIS_KEY_PREFIX } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid secret ID." },
        { status: 400 }
      );
    }

    const redisKey = `${REDIS_KEY_PREFIX}${id}`;

    // Atomic read-and-delete: GETDEL retrieves the value and deletes the key
    // in a single atomic operation, eliminating race conditions.
    const encryptedPayload = await getRedis().getdel<string>(redisKey);

    if (encryptedPayload === null || encryptedPayload === undefined) {
      return NextResponse.json(
        { error: "Secret not found or already burned." },
        { status: 404 }
      );
    }

    return NextResponse.json({ encryptedPayload }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/secrets/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
